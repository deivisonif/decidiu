import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Save, Stethoscope, Loader2 } from 'lucide-react';
import { maskCPF, maskPhone, maskCEP, maskSUS, maskCurrency } from '../../utils/masks';
import { capacitacaoAPI } from '../../lib/api';
import { municipiosAlagoas } from '../../utils/municipios';
import FormStepper from '../../components/FormStepper';
import { useCepAutocomplete } from '../../hooks/useCepAutocomplete';
import { useToast } from '../../contexts/ToastContext';

export default function CadastrarPacienteCapacitacao() {
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [idade, setIdade] = useState<number | null>(null);
  const [idadeResponsavel, setIdadeResponsavel] = useState<number | null>(null);
  const { loading: cepLoading, error: cepError, handleCepChange } = useCepAutocomplete();
  const [formData, setFormData] = useState({
    nome_completo: '',
    cartao_sus: '',
    cpf: '',
    data_nascimento: '',
    estado_civil: '',
    municipio: '',
    raca_cor: '',
    celular: '',
    escolaridade: '',
    etnia: '',
    possui_comorbidade: '',
    qual_comorbidade: '',
    qual_comorbidade_especifique: '',
    renda_mensal: '',
    componentes_familia: '',
    quantidade_componentes_familia: '',
    tipo_familia: '',
    tipo_familia_outro: '',
    renec_cartao_cria: '',
    cep: '',
    municipio_endereco: '',
    bairro: '',
    logradouro: '',
    numero: '',
    complemento: '',
    menor_idade: 'Não',
    parentesco: '',
    cpf_responsavel: '',
    nome_mae: '',
    data_nascimento_responsavel: '',
  });

  const steps = useMemo(() => {
    const baseSteps = [
      { number: 1, name: 'Identificação' },
      { number: 2, name: 'Dados Socioeconômicos' },
      { number: 3, name: 'Endereço' },
    ];

    if (idade !== null && idade < 18) {
      return [...baseSteps, { number: 4, name: 'Responsável Legal' }];
    }

    return baseSteps;
  }, [idade]);

  const calculateAge = (birthDate: string): number | null => {
    if (!birthDate) return null;

    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  useEffect(() => {
    if (id) {
      loadPaciente();
    }
  }, [id]);

  const loadPaciente = async () => {
    try {
      const data = await capacitacaoAPI.getPaciente(id!);
      if (data) {
        const validFields = {
          nome_completo: data.nome_completo || '',
          cartao_sus: data.cartao_sus || '',
          cpf: data.cpf || '',
          data_nascimento: data.data_nascimento || '',
          estado_civil: data.estado_civil || '',
          municipio: data.municipio || '',
          raca_cor: data.raca_cor || '',
          celular: data.celular || '',
          escolaridade: data.escolaridade || '',
          etnia: data.etnia || '',
          possui_comorbidade: data.possui_comorbidade || '',
          qual_comorbidade: data.qual_comorbidade || '',
          qual_comorbidade_especifique: data.qual_comorbidade_especifique || '',
          renda_mensal: data.renda_mensal || '',
          componentes_familia: data.componentes_familia || '',
          quantidade_componentes_familia: data.quantidade_componentes_familia || '',
          tipo_familia: data.tipo_familia || '',
          tipo_familia_outro: data.tipo_familia_outro || '',
          renec_cartao_cria: data.renec_cartao_cria || '',
          cep: data.cep || '',
          municipio_endereco: data.municipio_endereco || '',
          bairro: data.bairro || '',
          logradouro: data.logradouro || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          menor_idade: data.menor_idade || 'Não',
          parentesco: data.parentesco || '',
          cpf_responsavel: data.cpf_responsavel || '',
          nome_mae: data.nome_mae || '',
          data_nascimento_responsavel: data.data_nascimento_responsavel || '',
        };
        setFormData(validFields);

        if (data.data_nascimento) {
          setIdade(calculateAge(data.data_nascimento));
        }
        if (data.data_nascimento_responsavel) {
          setIdadeResponsavel(calculateAge(data.data_nascimento_responsavel));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar paciente:', error);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;

    if (name === 'cpf' || name === 'cpf_responsavel') {
      maskedValue = maskCPF(value);
    } else if (name === 'celular') {
      maskedValue = maskPhone(value);
    } else if (name === 'cep') {
      maskedValue = maskCEP(value);
    } else if (name === 'cartao_sus') {
      maskedValue = maskSUS(value);
    } else if (name === 'renda_mensal') {
      maskedValue = maskCurrency(value);
    }

    const updatedFormData = {
      ...formData,
      [name]: maskedValue
    };

    if (name === 'cep' && maskedValue.replace(/\D/g, '').length === 8) {
      const endereco = await handleCepChange(maskedValue);
      if (endereco) {
        updatedFormData.logradouro = endereco.logradouro || '';
        updatedFormData.bairro = endereco.bairro || '';
        if (endereco.municipio) {
          updatedFormData.municipio_endereco = endereco.municipio;
        }
      }
    }

    if (name === 'qual_comorbidade' && value !== 'Outros') {
      updatedFormData.qual_comorbidade_especifique = '';
    }

    if (name === 'tipo_familia' && value !== 'Outro') {
      updatedFormData.tipo_familia_outro = '';
    }

    if (name === 'data_nascimento') {
      const calculatedAge = calculateAge(value);
      setIdade(calculatedAge);

      if (calculatedAge !== null && calculatedAge < 18) {
        updatedFormData.menor_idade = 'Sim';
      } else if (calculatedAge !== null && calculatedAge >= 18) {
        updatedFormData.menor_idade = 'Não';
        updatedFormData.parentesco = '';
        updatedFormData.cpf_responsavel = '';
        updatedFormData.data_nascimento_responsavel = '';
      }
    }

    if (name === 'data_nascimento_responsavel') {
      const calculatedAgeResponsavel = calculateAge(value);
      setIdadeResponsavel(calculatedAgeResponsavel);
    }

    setFormData(updatedFormData);
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.nome_completo || !formData.cpf || !formData.cartao_sus || !formData.data_nascimento) {
        warning('Por favor, preencha todos os campos obrigatórios: Nome Completo, CPF, Cartão do SUS e Data de Nascimento.');
        return false;
      }
    }

    if (step === 2) {
      if (!formData.etnia) {
        warning('Por favor, selecione a etnia.');
        return false;
      }
      if (!formData.tipo_familia) {
        warning('Por favor, selecione o tipo de família.');
        return false;
      }
      if (formData.tipo_familia === 'Outro' && !formData.tipo_familia_outro) {
        warning('Por favor, informe qual o tipo de família.');
        return false;
      }
      if (formData.qual_comorbidade === 'Outros' && !formData.qual_comorbidade_especifique) {
        warning('Por favor, especifique qual comorbidade.');
        return false;
      }
    }

    if (step === 4 && idade !== null && idade < 18) {
      if (!formData.parentesco) {
        warning('Por favor, preencha o parentesco do responsável legal.');
        return false;
      }
      if (!formData.cpf_responsavel) {
        warning('Por favor, preencha o CPF do responsável legal.');
        return false;
      }
      if (!formData.data_nascimento_responsavel) {
        warning('Por favor, preencha a data de nascimento do responsável legal.');
        return false;
      }
      if (idadeResponsavel !== null && idadeResponsavel < 18) {
        warning('Responsável legal não pode ser menor de idade.');
        return false;
      }
    }

    return true;
  };

  const handleSaveDados = async () => {
    try {
      await capacitacaoAPI.updatePaciente(id!, {
        ...formData,
        status: 'em_andamento'
      });
      success('Dados salvos com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar dados:', error);
      toastError(`Erro ao salvar dados: ${error.message || 'Tente novamente.'}`);
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    try {
      await capacitacaoAPI.updatePaciente(id!, {
        ...formData,
        status: 'em_andamento'
      });

      if (currentStep === steps.length) {
        navigate(`/capacitacao/pacientes/${id}/prontuario`);
      } else {
        setCurrentStep(currentStep + 1);
      }
    } catch (error: any) {
      console.error('Erro ao salvar dados:', error);
      toastError(`Erro ao salvar dados: ${error.message || 'Tente novamente.'}`);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep1 = () => (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Dados de Identificação da Paciente</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-sm mb-1">Nome Completo <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="nome_completo"
            value={formData.nome_completo}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">CPF <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="cpf"
            value={formData.cpf}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="000.000.000-00"
            maxLength={14}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Cartão do SUS <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="cartao_sus"
            value={formData.cartao_sus}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Data de Nascimento <span className="text-red-500">*</span></label>
          <input
            type="date"
            name="data_nascimento"
            value={formData.data_nascimento}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Estado Civil</label>
          <select
            name="estado_civil"
            value={formData.estado_civil}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Selecione</option>
            <option value="Solteira">Solteira</option>
            <option value="Casada">Casada</option>
            <option value="Divorciada">Divorciada</option>
            <option value="Viúva">Viúva</option>
            <option value="União Estável">União Estável</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Município</label>
          <select
            name="municipio"
            value={formData.municipio}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Selecione</option>
            {municipiosAlagoas.map((municipio) => (
              <option key={municipio} value={municipio}>
                {municipio}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Celular</label>
          <input
            type="text"
            name="celular"
            value={formData.celular}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
            maxLength={15}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Escolaridade</label>
          <select
            name="escolaridade"
            value={formData.escolaridade}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Selecione</option>
            <option value="Analfabeto">Analfabeto</option>
            <option value="Fundamental Incompleto">Fundamental Incompleto</option>
            <option value="Fundamental Completo">Fundamental Completo</option>
            <option value="Médio Incompleto">Médio Incompleto</option>
            <option value="Médio Completo">Médio Completo</option>
            <option value="Superior Incompleto">Superior Incompleto</option>
            <option value="Superior Completo">Superior Completo</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Dados Socioeconômicos</h2>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">Etnia <span className="text-red-500">*</span></label>
          <select
            name="etnia"
            value={formData.etnia}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Selecione</option>
            <option value="Branca">Branca</option>
            <option value="Preta">Preta</option>
            <option value="Parda">Parda</option>
            <option value="Amarela">Amarela</option>
            <option value="Indígena">Indígena</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Possui Comorbidade?</label>
          <select
            name="possui_comorbidade"
            value={formData.possui_comorbidade}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Selecione</option>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
          </select>
        </div>

        {formData.possui_comorbidade === 'Sim' && (
          <div>
            <label className="block text-sm mb-1">Qual Comorbidade?</label>
            <select
              name="qual_comorbidade"
              value={formData.qual_comorbidade}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Selecione</option>
              <option value="Hipertensão">Hipertensão</option>
              <option value="Diabetes">Diabetes</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
        )}

        {formData.qual_comorbidade === 'Outros' && (
          <div className="col-span-2">
            <label className="block text-sm mb-1">Especifique <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="qual_comorbidade_especifique"
              value={formData.qual_comorbidade_especifique}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Digite a comorbidade"
            />
          </div>
        )}

        <div>
          <label className="block text-sm mb-1">Renda Mensal Familiar</label>
          <input
            type="text"
            name="renda_mensal"
            value={formData.renda_mensal}
            onChange={handleInputChange}
            placeholder="R$ 1.500,00"
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Recebe o Cartão CRIA?</label>
          <select
            name="renec_cartao_cria"
            value={formData.renec_cartao_cria}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Selecione</option>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Quantidade de componentes da família</label>
          <select
            name="quantidade_componentes_familia"
            value={formData.quantidade_componentes_familia}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Selecione</option>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="+5">+5</option>
          </select>
        </div>

        <div className="col-span-3">
          <label className="block text-sm mb-1">Tipo de Família <span className="text-red-500">*</span></label>
          <select
            name="tipo_familia"
            value={formData.tipo_familia}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Selecione</option>
            <option value="Família Agricultores">Família Agricultores</option>
            <option value="Família de Assentamento (Movimento MST)">Família de Assentamento (Movimento MST)</option>
            <option value="Família Acampada">Família Acampada</option>
            <option value="Família de Catadores de Material Reciclável">Família de Catadores de Material Reciclável</option>
            <option value="Família de comunidade de Terreiros">Família de comunidade de Terreiros</option>
            <option value="Família de Pescadores">Família de Pescadores</option>
            <option value="Família Ribeirinha">Família Ribeirinha</option>
            <option value="Família extrativista">Família extrativista</option>
            <option value="Família Cigana">Família Cigana</option>
            <option value="Família de Preso do Sistema Carcerário">Família de Preso do Sistema Carcerário</option>
            <option value="Família Quilombla">Família Quilombola</option>
            <option value="Família Atingida por Empreendimentos de Infraestrutura">Família Atingida por Empreendimentos de Infraestrutura</option>
            <option value="Família Beneficiaria do Programa Nacional do Credito Fundiário">Família Beneficiaria do Programa Nacional do Credito Fundiário</option>
            <option value="Nenhuma">Nenhuma</option>
            <option value="Outro">Outro</option>
          </select>
        </div>

        {formData.tipo_familia === 'Outro' && (
          <div className="col-span-3">
            <label className="block text-sm mb-1">Informe qual <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="tipo_familia_outro"
              value={formData.tipo_familia_outro}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Digite o tipo de família"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Endereço</h2>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">CEP</label>
          <div className="relative">
            <input
              type="text"
              name="cep"
              value={formData.cep}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
              maxLength={9}
              disabled={cepLoading}
              placeholder="00000-000"
            />
            {cepLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="animate-spin text-[#2d7a4f]" size={20} />
              </div>
            )}
          </div>
          {cepError && (
            <p className="text-red-500 text-sm mt-1">{cepError}</p>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1">Município</label>
          <select
            name="municipio_endereco"
            value={formData.municipio_endereco}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Selecione</option>
            {municipiosAlagoas.map((municipio) => (
              <option key={municipio} value={municipio}>
                {municipio}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Bairro</label>
          <input
            type="text"
            name="bairro"
            value={formData.bairro}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm mb-1">Logradouro</label>
          <input
            type="text"
            name="logradouro"
            value={formData.logradouro}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Número</label>
          <input
            type="text"
            name="numero"
            value={formData.numero}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div className="col-span-3">
          <label className="block text-sm mb-1">Complemento</label>
          <input
            type="text"
            name="complemento"
            value={formData.complemento}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Responsável Legal (se menor de idade)</h2>
      {idade !== null && idade < 18 ? (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Menor de Idade</label>
            <select
              name="menor_idade"
              value={formData.menor_idade}
              onChange={handleInputChange}
              disabled
              className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100"
            >
              <option value="">Selecione</option>
              <option value="Não">Não</option>
              <option value="Sim">Sim</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Parentesco <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="parentesco"
              value={formData.parentesco}
              onChange={handleInputChange}
              placeholder="Mãe"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">CPF <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="cpf_responsavel"
              value={formData.cpf_responsavel}
              onChange={handleInputChange}
              maxLength={14}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div className="col-span-3">
            <label className="block text-sm mb-1">Data de Nascimento <span className="text-red-500">*</span></label>
            <input
              type="date"
              name="data_nascimento_responsavel"
              value={formData.data_nascimento_responsavel}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            {idadeResponsavel !== null && idadeResponsavel < 18 && (
              <p className="text-red-500 text-sm mt-1">Responsável legal não pode ser menor de idade.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-gray-600">A paciente é maior de idade. Não é necessário informar responsável legal.</p>
      )}
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/capacitacao/pacientes')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Ficha da Paciente - Capacitação</h1>
      </div>

      <FormStepper steps={steps} currentStep={currentStep} />

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}

      <div className="flex gap-4 mt-6">
        {currentStep > 1 && (
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
        )}

        <button
          onClick={handleSaveDados}
          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          <Save size={20} />
          Salvar Dados
        </button>

        {currentStep === 3 && (
          <button
            onClick={() => navigate(`/capacitacao/pacientes/${id}/atendimento`)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors ml-auto"
            disabled={!id}
          >
            <Stethoscope size={20} />
            Registrar Atendimento
          </button>
        )}

        {currentStep !== 3 && (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold transition-colors ml-auto"
          >
            {currentStep === steps.length ? 'Ver Prontuário' : 'Próxima Página'}
            <ArrowRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
