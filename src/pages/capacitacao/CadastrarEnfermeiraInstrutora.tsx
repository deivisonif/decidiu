import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Eye, EyeOff, Upload, Loader2 } from 'lucide-react';
import { capacitacaoAPI } from '../../lib/api';
import { maskCPF, maskPhone, maskCEP } from '../../utils/masks';
import { validatePassword, PasswordStrengthIndicator } from '../../utils/passwordValidation';
import { municipiosAlagoas } from '../../utils/municipios';
import FormStepper from '../../components/FormStepper';
import { useCepAutocomplete } from '../../hooks/useCepAutocomplete';
import { useToast } from '../../contexts/ToastContext';

const steps = [
  { number: 1, name: 'Dados Pessoais' },
  { number: 2, name: 'Dados Profissionais' },
  { number: 3, name: 'Endereço' },
  { number: 4, name: 'Credenciais' },
];

export default function CadastrarEnfermeiraInstrutora() {
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    coren: '',
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
      if (!formData.nome || !formData.cpf || !formData.coren) {
        warning('Por favor, preencha os campos obrigatórios: Nome Completo, CPF e COREN.');
        return false;
      }
    }

    if (step === 2) {
      if (!formData.telefone || !formData.email || !formData.especialidade || !formData.unidade_saude) {
        warning('Por favor, preencha os campos obrigatórios: Telefone, Email, Especialidade e Unidade de Saúde.');
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

      if (formData.senha !== formData.confirmarSenha) {
        warning('As senhas não coincidem.');
        return false;
      }
    }

    return true;
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

    if (!validateStep(currentStep)) return;

    if (!formData.nome || !formData.cpf || !formData.coren || !formData.telefone || !formData.email || !formData.especialidade || !formData.unidade_saude || !formData.senha) {
      warning('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const validacao = validatePassword(formData.senha, formData.cpf);
    if (!validacao.isValid) {
      warning('A senha não atende aos requisitos de segurança: ' + validacao.errors.join(', '));
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      warning('As senhas não coincidem.');
      return;
    }

    const validationResult = await capacitacaoAPI.validateEnfermeiraInstrutora({
      cpf: formData.cpf,
      email: formData.email,
      coren: formData.coren,
    });

    if (!validationResult.valid) {
      toastError('Já existe cadastro com este CPF, e-mail ou COREN: ' + validationResult.errors.join(', '));
      return;
    }

    setLoading(true);
    try {
      await capacitacaoAPI.createEnfermeiraInstrutora(formData);
      success('Enfermeira instrutora cadastrada com sucesso!');
      navigate('/capacitacao/enfermeiras-instrutoras');
    } catch (error: any) {
      console.error('Erro ao cadastrar enfermeira instrutora:', error);
      toastError(error.message || 'Erro ao cadastrar enfermeira instrutora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-4">Dados Pessoais</h2>
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              COREN <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="coren"
              value={formData.coren}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              required
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-4">Dados Profissionais</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
            Unidade de Saúde <span className="text-red-500">*</span>
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
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-4">Endereço</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
            <select
              name="municipio"
              value={formData.municipio}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            >
              <option value="">Selecione</option>
              {municipiosAlagoas.map((municipio) => (
                <option key={municipio} value={municipio}>
                  {municipio}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-4">Credenciais de Acesso</h2>
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
              className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
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
          {formData.senha && <PasswordStrengthIndicator password={formData.senha} cpf={formData.cpf} />}
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
              className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
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
          <p className="text-xs text-gray-500 mt-1">Máximo 5MB (opcional)</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/capacitacao/enfermeiras-instrutoras')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-gray-800">Cadastrar Enfermeiro(a) Instrutor(a)</h1>
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
          onClick={() => navigate('/capacitacao/enfermeiras-instrutoras')}
          className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
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
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        )}
      </div>
    </div>
  );
}
