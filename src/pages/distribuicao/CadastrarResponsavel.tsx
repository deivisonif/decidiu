import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { ArrowLeft, ArrowRight, Save, UserCheck, Loader2 } from 'lucide-react';
import { distribuicaoAPI } from '../../lib/api';
import { maskCPF, maskPhone, maskCEP } from '../../utils/masks';
import { municipiosAlagoas } from '../../utils/municipios';
import { validarSenhaForte, getPasswordStrengthColor, getPasswordStrengthText } from '../../utils/passwordValidation';
import FormStepper from '../../components/FormStepper';
import { useCepAutocomplete } from '../../hooks/useCepAutocomplete';

const steps = [
  { number: 1, name: 'Dados Pessoais' },
  { number: 2, name: 'Endereço' },
  { number: 3, name: 'Dados Profissionais' },
  { number: 4, name: 'Credenciais de Acesso' },
];

export default function CadastrarResponsavel() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    telefone: '',
    cep: '',
    municipio: '',
    logradouro: '',
    bairro: '',
    numero: '',
    complemento: '',
    funcao_cargo: '',
    possui_conselho: false,
    nome_conselho: '',
    numero_conselho: '',
    senha: '',
    confirmar_senha: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { loading: cepLoading, error: cepError, handleCepChange } = useCepAutocomplete();

  const handleInputChange = async (field: string, value: any) => {
    let processedValue = value;

    if (field === 'cpf') {
      processedValue = maskCPF(value);
    } else if (field === 'telefone') {
      processedValue = maskPhone(value);
    } else if (field === 'cep') {
      processedValue = maskCEP(value);
    }

    const updatedFormData = { ...formData, [field]: processedValue };

    if (field === 'cep' && processedValue.replace(/\D/g, '').length === 8) {
      const endereco = await handleCepChange(processedValue);
      if (endereco) {
        updatedFormData.logradouro = endereco.logradouro || '';
        updatedFormData.bairro = endereco.bairro || '';
        if (endereco.municipio) {
          updatedFormData.municipio = endereco.municipio;
        }
      }
    }

    setFormData(updatedFormData);

    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    if (field === 'senha') {
      const strength = validarSenhaForte(processedValue);
      setPasswordStrength(strength);
    }
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.nome_completo.trim()) {
        newErrors.nome_completo = 'Nome completo é obrigatório';
      }
      if (!formData.cpf) {
        newErrors.cpf = 'CPF é obrigatório';
      } else if (formData.cpf.replace(/\D/g, '').length !== 11) {
        newErrors.cpf = 'CPF inválido';
      }
      if (!formData.telefone) {
        newErrors.telefone = 'Telefone é obrigatório';
      }
    }

    if (step === 2) {
      if (!formData.municipio) {
        newErrors.municipio = 'Município é obrigatório';
      }
    }

    if (step === 3) {
      if (!formData.funcao_cargo.trim()) {
        newErrors.funcao_cargo = 'Função/Cargo é obrigatório';
      }
      if (formData.possui_conselho) {
        if (!formData.nome_conselho.trim()) {
          newErrors.nome_conselho = 'Nome do conselho é obrigatório';
        }
        if (!formData.numero_conselho.trim()) {
          newErrors.numero_conselho = 'Número do conselho é obrigatório';
        }
      }
    }

    if (step === 4) {
      if (!formData.senha) {
        newErrors.senha = 'Senha é obrigatória';
      } else if (passwordStrength < 3) {
        newErrors.senha = 'A senha não atende aos requisitos mínimos de segurança';
      }
      if (!formData.confirmar_senha) {
        newErrors.confirmar_senha = 'Confirmação de senha é obrigatória';
      } else if (formData.senha !== formData.confirmar_senha) {
        newErrors.confirmar_senha = 'As senhas não coincidem';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateStep(currentStep)) {
      return;
    }

    setLoading(true);

    try {
      const cpfLimpo = formData.cpf.replace(/\D/g, '');
      const telefoneLimpo = formData.telefone.replace(/\D/g, '');

      const enderecoCompleto = [
        formData.logradouro,
        formData.numero,
        formData.complemento,
        formData.bairro,
        formData.municipio,
        'AL',
        formData.cep
      ].filter(Boolean).join(', ');

      const dataToSend = {
        nome_completo: formData.nome_completo.trim(),
        cpf: cpfLimpo,
        endereco_completo: enderecoCompleto || 'Não informado',
        telefone: telefoneLimpo,
        funcao_cargo: formData.funcao_cargo.trim(),
        possui_conselho: formData.possui_conselho,
        nome_conselho: formData.possui_conselho ? formData.nome_conselho.trim() : null,
        numero_conselho: formData.possui_conselho ? formData.numero_conselho.trim() : null,
        senha: formData.senha,
      };

      await distribuicaoAPI.createResponsavel(dataToSend);
      success('Responsável cadastrado com sucesso!');
      navigate('/distribuicao/dashboard');
    } catch (error: any) {
      console.error('Erro ao cadastrar responsável:', error);
      toastError(error.message || 'Erro ao cadastrar responsável. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200">
        Dados Pessoais
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome Completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.nome_completo}
            onChange={(e) => handleInputChange('nome_completo', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent ${
              errors.nome_completo ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Digite o nome completo"
          />
          {errors.nome_completo && (
            <p className="text-red-500 text-sm mt-1">{errors.nome_completo}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CPF <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.cpf}
              onChange={(e) => handleInputChange('cpf', maskCPF(e.target.value))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent ${
                errors.cpf ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="000.000.000-00"
              maxLength={14}
            />
            {errors.cpf && (
              <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.telefone}
              onChange={(e) => handleInputChange('telefone', maskPhone(e.target.value))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent ${
                errors.telefone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
            {errors.telefone && (
              <p className="text-red-500 text-sm mt-1">{errors.telefone}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200">
        Endereço
      </h2>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CEP
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.cep}
                onChange={(e) => handleInputChange('cep', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent disabled:bg-gray-100"
                placeholder="00000-000"
                maxLength={9}
                disabled={cepLoading}
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
              value={formData.municipio}
              onChange={(e) => handleInputChange('municipio', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent ${
                errors.municipio ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Selecione um município</option>
              {municipiosAlagoas.map((municipio) => (
                <option key={municipio} value={municipio}>
                  {municipio}
                </option>
              ))}
            </select>
            {errors.municipio && (
              <p className="text-red-500 text-sm mt-1">{errors.municipio}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logradouro
          </label>
          <input
            type="text"
            value={formData.logradouro}
            onChange={(e) => handleInputChange('logradouro', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            placeholder="Rua, Avenida, etc."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bairro
            </label>
            <input
              type="text"
              value={formData.bairro}
              onChange={(e) => handleInputChange('bairro', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              placeholder="Nome do bairro"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número
            </label>
            <input
              type="text"
              value={formData.numero}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              placeholder="Número"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Complemento
          </label>
          <input
            type="text"
            value={formData.complemento}
            onChange={(e) => handleInputChange('complemento', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            placeholder="Apartamento, bloco, sala, etc."
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200">
        Dados Profissionais
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Função / Cargo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.funcao_cargo}
            onChange={(e) => handleInputChange('funcao_cargo', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent ${
              errors.funcao_cargo ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Ex: Coordenador(a), Gestor(a), etc."
          />
          {errors.funcao_cargo && (
            <p className="text-red-500 text-sm mt-1">{errors.funcao_cargo}</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="possui_conselho"
              checked={formData.possui_conselho}
              onChange={(e) => {
                handleInputChange('possui_conselho', e.target.checked);
                if (!e.target.checked) {
                  handleInputChange('nome_conselho', '');
                  handleInputChange('numero_conselho', '');
                }
              }}
              className="w-5 h-5 text-[#2d7a4f] rounded focus:ring-[#2d7a4f]"
            />
            <label htmlFor="possui_conselho" className="text-sm font-medium text-gray-700">
              Possui conselho profissional?
            </label>
          </div>

          {formData.possui_conselho && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Conselho <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nome_conselho}
                  onChange={(e) => handleInputChange('nome_conselho', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent ${
                    errors.nome_conselho ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ex: COREN, CRM, etc."
                />
                {errors.nome_conselho && (
                  <p className="text-red-500 text-sm mt-1">{errors.nome_conselho}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do Conselho <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.numero_conselho}
                  onChange={(e) => handleInputChange('numero_conselho', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent ${
                    errors.numero_conselho ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Digite o número do conselho"
                />
                {errors.numero_conselho && (
                  <p className="text-red-500 text-sm mt-1">{errors.numero_conselho}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200">
        Credenciais de Acesso
      </h2>

      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Informação:</strong> O CPF será utilizado como login para acessar o sistema.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.senha}
              onChange={(e) => handleInputChange('senha', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent ${
                errors.senha ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Digite uma senha forte"
            />
            {errors.senha && (
              <p className="text-red-500 text-sm mt-1">{errors.senha}</p>
            )}
            {formData.senha && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getPasswordStrengthColor(passwordStrength)}`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {getPasswordStrengthText(passwordStrength)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Senha <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.confirmar_senha}
              onChange={(e) => handleInputChange('confirmar_senha', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent ${
                errors.confirmar_senha ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Confirme a senha"
            />
            {errors.confirmar_senha && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmar_senha}</p>
            )}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-700 font-medium mb-2">Requisitos da senha:</p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Mínimo de 8 caracteres</li>
            <li>Pelo menos uma letra maiúscula</li>
            <li>Pelo menos uma letra minúscula</li>
            <li>Pelo menos um número</li>
            <li>Pelo menos um caractere especial (!@#$%^&*)</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/distribuicao/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <UserCheck size={32} className="text-[#2d7a4f]" />
            <h1 className="text-3xl font-bold text-gray-800">Cadastrar Responsável Por Insumos</h1>
          </div>
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
            type="button"
            onClick={() => navigate('/distribuicao/dashboard')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold transition-colors ml-auto"
            >
              Próxima Página
              <ArrowRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors ml-auto"
            >
              <Save size={20} />
              {loading ? 'Salvando...' : 'Salvar Dados'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
