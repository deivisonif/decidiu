import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Eye, EyeOff, Upload, Loader2, UserPlus } from 'lucide-react';
import { ambulatorialAPI } from '../../lib/api';
import { maskCPF, maskPhone, maskCEP } from '../../utils/masks';
import { validatePassword, PasswordStrengthIndicator } from '../../utils/passwordValidation';
import FormStepper from '../../components/FormStepper';
import { useCepAutocomplete } from '../../hooks/useCepAutocomplete';
import { useToast } from '../../contexts/ToastContext';

const steps = [
  { number: 1, name: 'Dados Pessoais' },
  { number: 2, name: 'Dados Profissionais' },
  { number: 3, name: 'Endereço' },
  { number: 4, name: 'Credenciais' },
];

interface Props {
  onVoltar?: () => void;
}

export default function CadastrarInstrutora({ onVoltar }: Props) {
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    tipo_registro: 'CRM',
    numero_registro: '',
    telefone: '',
    email: '',
    especialidade: '',
    unidade_saude: '',
    cep: '',
    logradouro: '',
    municipio: '',
    bairro: '',
    numero: '',
    complemento: '',
    senha: '',
    confirmarSenha: '',
    diploma_filename: '',
    diploma_content: '',
  });
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const { loading: cepLoading, error: cepError, handleCepChange } = useCepAutocomplete();

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;

    if (name === 'cpf') {
      maskedValue = maskCPF(value);
    } else if (name === 'telefone') {
      maskedValue = maskPhone(value);
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

    setFormData(updatedFormData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        warning('Por favor, selecione apenas arquivos PDF.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        warning('O arquivo deve ter no máximo 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result?.toString().split(',')[1] || '';
        setFormData({
          ...formData,
          diploma_filename: file.name,
          diploma_content: base64,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.nome) {
        warning('Por favor, preencha o nome completo.');
        return false;
      }
      if (!formData.cpf) {
        warning('Por favor, preencha o CPF.');
        return false;
      }
    }

    if (step === 2) {
      if (!formData.tipo_registro) {
        warning('Por favor, selecione o tipo de registro profissional.');
        return false;
      }
      if (!formData.numero_registro) {
        warning('Por favor, preencha o número do registro.');
        return false;
      }
      if (!formData.telefone) {
        warning('Por favor, preencha o telefone.');
        return false;
      }
      if (!formData.email) {
        warning('Por favor, preencha o email.');
        return false;
      }
      if (!formData.especialidade) {
        warning('Por favor, preencha a especialidade.');
        return false;
      }
      if (!formData.unidade_saude) {
        warning('Por favor, preencha a unidade de saúde.');
        return false;
      }
    }

    if (step === 4) {
      if (!formData.senha) {
        warning('Por favor, preencha a senha.');
        return false;
      }

      const validacao = validatePassword(formData.senha, formData.cpf);
      if (!validacao.isValid) {
        warning('A senha não atende aos requisitos de segurança: ' + validacao.errors.join(', '));
        return false;
      }

      if (!formData.confirmarSenha) {
        warning('Por favor, confirme a senha.');
        return false;
      }

      if (formData.senha !== formData.confirmarSenha) {
        warning('As senhas não coincidem.');
        return false;
      }
    }

    return true;
  };

  const handleSaveDados = async () => {
    try {
      success('Dados salvos temporariamente!');
    } catch (error: any) {
      console.error('Erro ao salvar dados:', error);
      toastError(`Erro ao salvar dados: ${error.message || 'Tente novamente.'}`);
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === steps.length) {
      await handleSubmit();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(4)) {
      return;
    }

    const validationResult = await ambulatorialAPI.validateEnfermeiraInstrutora({
      cpf: formData.cpf,
      email: formData.email,
      numero_registro: formData.numero_registro,
    });

    if (!validationResult.valid) {
      toastError('Já existe cadastro com este CPF, e-mail ou número de registro: ' + validationResult.errors.join(', '));
      return;
    }

    setLoading(true);
    try {
      await ambulatorialAPI.createEnfermeiraInstrutora(formData);
      success('Profissional cadastrado com sucesso!');
      navigate('/ambulatorial/instrutoras');
    } catch (error: any) {
      console.error('Erro ao cadastrar profissional:', error);
      toastError(error.message || 'Erro ao cadastrar profissional. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nome Completo <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="nome"
          value={formData.nome}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
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
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Este será usado como login</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
        <p className="text-sm text-blue-800">
          <strong>Cargo selecionado:</strong> Profissional Ambulatorial
        </p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Registro Profissional <span className="text-red-500">*</span>
          </label>
          <select
            name="tipo_registro"
            value={formData.tipo_registro}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            required
          >
            <option value="CRM">CRM</option>
            <option value="COREN">COREN</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número do Registro ({formData.tipo_registro}) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="numero_registro"
            value={formData.numero_registro}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefone <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="telefone"
            value={formData.telefone}
            onChange={handleInputChange}
            maxLength={15}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Especialidade <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="especialidade"
            value={formData.especialidade}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unidade de Saúde (vínculo) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="unidade_saude"
            value={formData.unidade_saude}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Diploma (PDF)
          </label>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <Upload size={20} />
              <span>{formData.diploma_filename || 'Selecionar arquivo'}</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {formData.diploma_filename && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, diploma_filename: '', diploma_content: '' })}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Remover
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Máximo 5MB</p>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CEP
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
              Município
            </label>
            <input
              type="text"
              name="municipio"
              value={formData.municipio}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logradouro
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
              Bairro
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
              Número
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
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Senha <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={mostrarSenha ? 'text' : 'password'}
              name="senha"
              value={formData.senha}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <PasswordStrengthIndicator password={formData.senha} cpf={formData.cpf} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirmar Senha <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={mostrarConfirmarSenha ? 'text' : 'password'}
              name="confirmarSenha"
              value={formData.confirmarSenha}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {mostrarConfirmarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {formData.confirmarSenha && formData.senha !== formData.confirmarSenha && (
            <p className="text-sm text-red-600 mt-1">As senhas não coincidem</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => onVoltar ? onVoltar() : navigate('/gestao/cadastrar-profissional')}
          className="mb-4 px-4 py-2 text-sm text-[#1a4d2e] hover:text-[#2d7a4d] hover:bg-green-50 rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Voltar para seleção de cargo
        </button>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#1a4d2e] rounded-lg">
              <UserPlus size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Cadastrar Profissional - Ambulatorial</h1>
              <p className="text-gray-600 text-sm">Preencha os dados do profissional em todas as etapas</p>
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
                onClick={() => onVoltar ? onVoltar() : navigate('/gestao/cadastrar-profissional')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>

              <button
                onClick={handleNext}
                disabled={loading}
                className="px-6 py-2 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#2d7a4d] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {currentStep === steps.length ? (
                  <>
                    <Save size={16} />
                    {loading ? 'Salvando...' : 'Finalizar Cadastro'}
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
