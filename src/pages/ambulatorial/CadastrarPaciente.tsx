import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save, ArrowRight, ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import { maskCPF, maskPhone, maskCurrency, maskCEP } from '../../utils/masks';
import { ambulatorialAPI } from '../../lib/api';
import FormStepper from '../../components/FormStepper';
import { useCepAutocomplete } from '../../hooks/useCepAutocomplete';
import { useToast } from '../../contexts/ToastContext';

interface Municipio {
  id: number;
  nome: string;
  estado: string;
}

export default function CadastrarPaciente() {
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();
  const [searchParams] = useSearchParams();
  const pacienteId = searchParams.get('id');
  const modoEdicao = searchParams.get('modo') === 'edicao';
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(modoEdicao);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(true);

  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    cartao_sus: '',
    data_nascimento: '',
    estado_civil: '',
    celular: '',
    municipio_nascimento: '',
    municipio: '',
    bairro: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    escolaridade: '',
    etnia: '',
    possui_comorbidade: '',
    qual_comorbidade: '',
    qual_comorbidade_especifique: '',
    renda_mensal: '',
    quantos_componentes_familia: '',
    recebe_cartao_cria: '',
    tipo_familia: '',
    tipo_familia_outro: '',
    menor_idade: '',
    parentesco: '',
    cpf_responsavel: '',
    nome_completo_responsavel: '',
    data_nascimento_responsavel: '',
  });

  const [idade, setIdade] = useState<number | null>(null);
  const [idadeResponsavel, setIdadeResponsavel] = useState<number | null>(null);
  const { loading: cepLoading, error: cepError, handleCepChange } = useCepAutocomplete();

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

  useEffect(() => {
    loadMunicipios();
  }, []);

  useEffect(() => {
    if (modoEdicao && pacienteId) {
      loadPacienteData();
    }
  }, [modoEdicao, pacienteId]);

  const loadMunicipios = async () => {
    setLoadingMunicipios(true);
    try {
      const response = await fetch('/api/municipios');
      const data = await response.json();
      setMunicipios(data || []);
    } catch (error) {
      console.error('Erro ao carregar municípios:', error);
    } finally {
      setLoadingMunicipios(false);
    }
  };

  const loadPacienteData = async () => {
    try {
      setLoading(true);
      const data = await ambulatorialAPI.getPaciente(pacienteId!);

      const loadedFormData = {
        nome_completo: data.nome_completo || '',
        cpf: data.cpf ? maskCPF(data.cpf) : '',
        cartao_sus: data.cartao_sus || '',
        data_nascimento: data.data_nascimento || '',
        estado_civil: data.estado_civil || '',
        celular: data.celular ? maskPhone(data.celular) : '',
        municipio_nascimento: data.municipio_nascimento || data.municipio || '',
        municipio: data.municipio || '',
        bairro: data.bairro || '',
        cep: data.cep ? maskCEP(data.cep) : '',
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        escolaridade: data.escolaridade || '',
        etnia: data.etnia || '',
        possui_comorbidade: data.possui_comorbidade || '',
        qual_comorbidade: data.qual_comorbidade || '',
        qual_comorbidade_especifique: data.qual_comorbidade_especifique || '',
        renda_mensal: data.renda_mensal ? maskCurrency(data.renda_mensal) : '',
        quantos_componentes_familia: data.quantos_componentes_familia || '',
        recebe_cartao_cria: data.recebe_cartao_cria || '',
        tipo_familia: data.tipo_familia || '',
        tipo_familia_outro: data.tipo_familia_outro || '',
        menor_idade: data.menor_idade || '',
        parentesco: data.parentesco || '',
        cpf_responsavel: data.cpf_responsavel ? maskCPF(data.cpf_responsavel) : '',
        nome_completo_responsavel: data.nome_completo_responsavel || '',
        data_nascimento_responsavel: data.data_nascimento_responsavel || '',
      };

      setFormData(loadedFormData);

      if (data.data_nascimento) {
        const calculatedAge = calculateAge(data.data_nascimento);
        setIdade(calculatedAge);
      }

      if (data.data_nascimento_responsavel) {
        const calculatedAgeResponsavel = calculateAge(data.data_nascimento_responsavel);
        setIdadeResponsavel(calculatedAgeResponsavel);
      }
    } catch (error) {
      console.error('Erro ao carregar paciente:', error);
      toastError('Erro ao carregar dados da paciente.');
      navigate('/ambulatorial/lista-pacientes');
    } finally {
      setLoading(false);
    }
  };

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

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;

    if (name === 'cpf' || name === 'cpf_responsavel') {
      maskedValue = maskCPF(value);
    } else if (name === 'celular') {
      maskedValue = maskPhone(value);
    } else if (name === 'renda_mensal') {
      maskedValue = maskCurrency(value);
    } else if (name === 'cep') {
      maskedValue = maskCEP(value);
    }

    const updatedFormData = { ...formData, [name]: maskedValue };

    if (name === 'cep' && maskedValue.replace(/\D/g, '').length === 8) {
      const endereco = await handleCepChange(maskedValue);
      if (endereco) {
        updatedFormData.logradouro = endereco.logradouro || '';
        updatedFormData.bairro = endereco.bairro || '';
        if (endereco.municipio) {
          updatedFormData.municipio = endereco.municipio;
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
        updatedFormData.nome_completo_responsavel = '';
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
      if (!formData.nome_completo) {
        warning('Por favor, preencha o nome completo.');
        return false;
      }
      if (!formData.cpf) {
        warning('Por favor, preencha o CPF.');
        return false;
      }
      if (!formData.cartao_sus) {
        warning('Por favor, preencha o Cartão do SUS.');
        return false;
      }
      if (!formData.data_nascimento) {
        warning('Por favor, preencha a data de nascimento.');
        return false;
      }
      if (!formData.estado_civil) {
        warning('Por favor, selecione o estado civil.');
        return false;
      }
      if (!formData.municipio_nascimento) {
        warning('Por favor, selecione o município de nascimento.');
        return false;
      }
      if (!formData.celular) {
        warning('Por favor, preencha o celular.');
        return false;
      }
    }

    if (step === 2) {
      if (!formData.escolaridade) {
        warning('Por favor, selecione a escolaridade.');
        return false;
      }
      if (!formData.etnia) {
        warning('Por favor, selecione a etnia.');
        return false;
      }
      if (!formData.possui_comorbidade) {
        warning('Por favor, selecione se possui comorbidade.');
        return false;
      }
      if (formData.possui_comorbidade === 'Sim' && !formData.qual_comorbidade) {
        warning('Por favor, selecione qual comorbidade.');
        return false;
      }
      if (formData.qual_comorbidade === 'Outros' && !formData.qual_comorbidade_especifique) {
        warning('Por favor, especifique qual comorbidade.');
        return false;
      }
      if (!formData.renda_mensal) {
        warning('Por favor, preencha a renda mensal familiar.');
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
    }

    if (step === 3) {
      if (!formData.cep) {
        warning('Por favor, preencha o CEP.');
        return false;
      }
      if (!formData.municipio) {
        warning('Por favor, selecione o município.');
        return false;
      }
      if (!formData.logradouro) {
        warning('Por favor, preencha o logradouro.');
        return false;
      }
      if (!formData.bairro) {
        warning('Por favor, preencha o bairro.');
        return false;
      }
      if (!formData.numero) {
        warning('Por favor, preencha o número.');
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
      if (!formData.nome_completo_responsavel) {
        warning('Por favor, preencha o nome completo do responsável legal.');
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
      if (modoEdicao && pacienteId) {
        await ambulatorialAPI.updatePaciente(pacienteId, formData);
      } else {
        await ambulatorialAPI.createPaciente(formData);
      }
      success('Dados salvos com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar dados:', error);
      toastError(`Erro ao salvar dados: ${error.message || 'Tente novamente.'}`);
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    try {
      if (currentStep === steps.length) {
        if (!modoEdicao && formData.cpf) {
          setLoading(true);
          try {
            const result = await ambulatorialAPI.validateCPF(formData.cpf);
            if (!result.valid) {
              toastError('Já existe uma paciente cadastrada com este CPF.');
              return;
            }
          } catch {
            // se o endpoint falhar, deixa prosseguir — o backend também valida no POST
          } finally {
            setLoading(false);
          }
        }

        localStorage.setItem('ambulatorial_temp_paciente', JSON.stringify(formData));
        if (modoEdicao && pacienteId) {
          localStorage.setItem('ambulatorial_paciente_id', pacienteId);
          navigate(`/ambulatorial/cadastrar-paciente/dados-ginecologicos?id=${pacienteId}&modo=edicao`);
        } else {
          navigate('/ambulatorial/cadastrar-paciente/dados-ginecologicos');
        }
      } else {
        setCurrentStep(currentStep + 1);
      }
    } catch (error: any) {
      console.error('Erro ao avançar:', error);
      toastError(`Erro: ${error.message || 'Tente novamente.'}`);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nome_completo"
              value={formData.nome_completo}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CPF <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="cpf"
              value={formData.cpf}
              onChange={handleInputChange}
              maxLength={14}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cartão do SUS <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="cartao_sus"
              value={formData.cartao_sus}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Nascimento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="data_nascimento"
              value={formData.data_nascimento}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado Civil <span className="text-red-500">*</span>
            </label>
            <select
              name="estado_civil"
              value={formData.estado_civil}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            >
              <option value="">Selecione</option>
              <option value="Solteira">Solteira</option>
              <option value="Casada">Casada</option>
              <option value="Divorciada">Divorciada</option>
              <option value="Viúva">Viúva</option>
              <option value="União Estável">União Estável</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Município de Nascimento <span className="text-red-500">*</span>
            </label>
            <select
              name="municipio_nascimento"
              value={formData.municipio_nascimento}
              onChange={handleInputChange}
              disabled={loadingMunicipios}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            >
              <option value="">
                {loadingMunicipios ? 'Carregando municípios...' : 'Selecione um município'}
              </option>
              {municipios.map((municipio) => (
                <option key={municipio.id} value={municipio.nome}>
                  {municipio.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Celular <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="celular"
              value={formData.celular}
              onChange={handleInputChange}
              maxLength={15}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>
        </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Escolaridade <span className="text-red-500">*</span>
            </label>
            <select
              name="escolaridade"
              value={formData.escolaridade}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            >
              <option value="">Selecione</option>
              <option value="Analfabeta">Analfabeta</option>
              <option value="Fundamental Incompleto">Fundamental Incompleto</option>
              <option value="Fundamental Completo">Fundamental Completo</option>
              <option value="Médio Incompleto">Médio Incompleto</option>
              <option value="Médio Completo">Médio Completo</option>
              <option value="Superior Incompleto">Superior Incompleto</option>
              <option value="Superior Completo">Superior Completo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Etnia <span className="text-red-500">*</span>
            </label>
            <select
              name="etnia"
              value={formData.etnia}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Possui Comorbidade? <span className="text-red-500">*</span>
            </label>
            <select
              name="possui_comorbidade"
              value={formData.possui_comorbidade}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            >
              <option value="">Selecione</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </div>
        </div>

        {formData.possui_comorbidade === 'Sim' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qual a Comorbidade? <span className="text-red-500">*</span>
              </label>
              <select
                name="qual_comorbidade"
                value={formData.qual_comorbidade}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              >
                <option value="">Selecione</option>
                <option value="Hipertensão">Hipertensão</option>
                <option value="Diabetes">Diabetes</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            {formData.qual_comorbidade === 'Outros' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especifique <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="qual_comorbidade_especifique"
                  value={formData.qual_comorbidade_especifique}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                  placeholder="Digite a comorbidade"
                />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Renda Mensal Familiar <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="renda_mensal"
              value={formData.renda_mensal}
              onChange={handleInputChange}
              placeholder="R$ 1.500,00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recebe o Cartão CRIA?
            </label>
            <select
              name="recebe_cartao_cria"
              value={formData.recebe_cartao_cria}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            >
              <option value="">Selecione</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantos Componentes na Família?
            </label>
            <input
              type="text"
              name="quantos_componentes_familia"
              value={formData.quantos_componentes_familia}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Família <span className="text-red-500">*</span>
            </label>
            <select
              name="tipo_familia"
              value={formData.tipo_familia}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
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
              <option value="Família Quilombola">Família Quilombola</option>
              <option value="Família Atingida por Empreendimentos de Infraestrutura">Família Atingida por Empreendimentos de Infraestrutura</option>
              <option value="Família Beneficiaria do Programa Nacional do Credito Fundiário">Família Beneficiaria do Programa Nacional do Credito Fundiário</option>
              <option value="Nenhuma">Nenhuma</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>

        {formData.tipo_familia === 'Outro' && (
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Informe qual <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="tipo_familia_outro"
                value={formData.tipo_familia_outro}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                placeholder="Digite o tipo de família"
              />
            </div>
          </div>
        )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CEP <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="cep"
                value={formData.cep}
                onChange={handleInputChange}
                maxLength={9}
                disabled={cepLoading}
                placeholder="00000-000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent disabled:bg-gray-100"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Município <span className="text-red-500">*</span>
            </label>
            <select
              name="municipio"
              value={formData.municipio}
              onChange={handleInputChange}
              disabled={loadingMunicipios}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            >
              <option value="">
                {loadingMunicipios ? 'Carregando municípios...' : 'Selecione um município'}
              </option>
              {municipios.map((municipio) => (
                <option key={municipio.id} value={municipio.nome}>
                  {municipio.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logradouro <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="logradouro"
              value={formData.logradouro}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bairro <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="bairro"
              value={formData.bairro}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="numero"
              value={formData.numero}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Complemento
            </label>
            <input
              type="text"
              name="complemento"
              value={formData.complemento}
              onChange={handleInputChange}
              placeholder="Apartamento, casa..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>
        </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Menor de Idade
            </label>
            <select
              name="menor_idade"
              value={formData.menor_idade}
              onChange={handleInputChange}
              disabled={idade !== null && idade < 18}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent bg-gray-100"
            >
              <option value="">Selecione</option>
              <option value="Não">Não</option>
              <option value="Sim">Sim</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parentesco <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="parentesco"
              value={formData.parentesco}
              onChange={handleInputChange}
              placeholder="Mãe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CPF <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="cpf_responsavel"
              value={formData.cpf_responsavel}
              onChange={handleInputChange}
              maxLength={14}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nome_completo_responsavel"
              value={formData.nome_completo_responsavel}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Nascimento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="data_nascimento_responsavel"
              value={formData.data_nascimento_responsavel}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
            {idadeResponsavel !== null && idadeResponsavel < 18 && (
              <p className="text-red-500 text-sm mt-1">Responsável legal não pode ser menor de idade.</p>
            )}
          </div>
        </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Carregando dados da paciente...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#1a4d2e] rounded-lg">
              <UserPlus size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {modoEdicao ? 'Editar Paciente' : 'Ficha da Paciente'} - Ambulatorial
              </h1>
              <p className="text-gray-600 text-sm">Preencha os dados da paciente em todas as etapas</p>
            </div>
          </div>

          <FormStepper steps={steps} currentStep={currentStep} />

          <div className="mt-6">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}

            <div className="flex justify-end gap-3 mt-6">
              {currentStep > 1 && (
                <button
                  onClick={handlePrevious}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Voltar
                </button>
              )}

              <button
                onClick={handleSaveDados}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Save size={16} />
                Salvar Rascunho
              </button>

              <button
                onClick={handleNext}
                className="px-6 py-2 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#2d7a4d] transition-colors flex items-center gap-2"
              >
                {currentStep === steps.length ? (
                  <>
                    Próxima Página
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    Próximo
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
