import { useState } from 'react';
import { UserPlus, Save, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { maskCPF, maskPhone, maskCEP } from '../utils/masks';
import { municipiosAlagoas } from '../utils/municipios';
import { useAuth } from '../contexts/AuthContext';
import { useCepAutocomplete } from '../hooks/useCepAutocomplete';

const API_URL = '/api';

interface FormularioCadastroUsuarioProps {
  cargo: string;
  onVoltar: () => void;
}

interface FormData {
  nomeCompleto: string;
  cpf: string;
  profissao: string;
  email: string;
  telefone: string;
  vinculoEmpregaticio: string;
  cep: string;
  municipio: string;
  logradouro: string;
  bairro: string;
  numero: string;
  complemento: string;
  senha: string;
  confirmarSenha: string;
}

export default function FormularioCadastroUsuario({ cargo, onVoltar }: FormularioCadastroUsuarioProps) {
  const { usuario } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { loading: cepLoading, error: cepError, handleCepChange } = useCepAutocomplete();

  const [formData, setFormData] = useState<FormData>({
    nomeCompleto: '',
    cpf: '',
    profissao: '',
    email: '',
    telefone: '',
    vinculoEmpregaticio: '',
    cep: '',
    municipio: '',
    logradouro: '',
    bairro: '',
    numero: '',
    complemento: '',
    senha: '',
    confirmarSenha: ''
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validateStep1 = () => {
    const newErrors: Partial<FormData> = {};

    if (!formData.nomeCompleto.trim()) {
      newErrors.nomeCompleto = 'Nome completo é obrigatório';
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (formData.cpf.replace(/\D/g, '').length !== 11) {
      newErrors.cpf = 'CPF deve conter 11 dígitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Partial<FormData> = {};

    if (!formData.profissao.trim()) {
      newErrors.profissao = 'Profissão é obrigatória';
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (formData.telefone.replace(/\D/g, '').length < 10) {
      newErrors.telefone = 'Telefone inválido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.vinculoEmpregaticio.trim()) {
      newErrors.vinculoEmpregaticio = 'Vínculo empregatício é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Partial<FormData> = {};

    if (!formData.cep.trim()) {
      newErrors.cep = 'CEP é obrigatório';
    } else if (formData.cep.replace(/\D/g, '').length !== 8) {
      newErrors.cep = 'CEP deve conter 8 dígitos';
    }

    if (!formData.municipio) {
      newErrors.municipio = 'Município é obrigatório';
    }

    if (!formData.logradouro.trim()) {
      newErrors.logradouro = 'Logradouro é obrigatório';
    }

    if (!formData.bairro.trim()) {
      newErrors.bairro = 'Bairro é obrigatório';
    }

    if (!formData.numero.trim()) {
      newErrors.numero = 'Número é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors: Partial<FormData> = {};

    if (!formData.senha) {
      newErrors.senha = 'Senha é obrigatória';
    } else if (formData.senha.length < 8) {
      newErrors.senha = 'Senha deve ter no mínimo 8 caracteres';
    }

    if (!formData.confirmarSenha) {
      newErrors.confirmarSenha = 'Confirmação de senha é obrigatória';
    } else if (formData.senha !== formData.confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setStep(4);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep4()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_completo: formData.nomeCompleto,
          email: formData.email.toLowerCase(),
          cpf: formData.cpf.replace(/\D/g, ''),
          telefone: formData.telefone.replace(/\D/g, ''),
          profissao: formData.profissao,
          vinculo_empregaticio: formData.vinculoEmpregaticio,
          cep: formData.cep.replace(/\D/g, ''),
          municipio: formData.municipio,
          logradouro: formData.logradouro,
          bairro: formData.bairro,
          numero: formData.numero,
          complemento: formData.complemento || null,
          cargo: cargo,
          senha_hash: formData.senha,
          criado_por: usuario?.id,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Erro ao cadastrar usuário';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Erro ${response.status}: ${response.statusText || 'Falha na comunicação com o servidor'}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Usuário cadastrado com sucesso:', result);

      setSuccess(true);
      setTimeout(() => {
        onVoltar();
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error('Erro ao cadastrar usuário:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('Erro de conexão. Verifique se o servidor está rodando.');
      } else if (err.message.includes('Email já cadastrado')) {
        setError('Este email já está cadastrado no sistema');
      } else if (err.message.includes('CPF já cadastrado')) {
        setError('Este CPF já está cadastrado no sistema');
      } else {
        setError(err.message || 'Erro ao cadastrar usuário. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = async (field: keyof FormData, value: string) => {
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
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getCargoDescricao = () => {
    const descricoes: { [key: string]: string } = {
      'Administrador': 'Acesso total ao sistema, gerencia hierarquias e permissões',
      'Coordenador': 'Acesso limitado a gestão e operações, pode gerenciar alunos',
      'Enfermeiro(a) Instrutor(a)': 'Profissional capacitado para instruir e supervisionar inserções de DIU e Implanon',
      'Enfermeiro(a) Aluno(a)': 'Profissional em processo de capacitação para inserções de DIU e Implanon',
      'Responsável por Insumos': 'Acesso exclusivo ao módulo Distribuição/Insumos',
      'Visitante': 'Visualização apenas de dashboards',
      'Recepcionista': 'Acesso ao módulo Ambulatorial para cadastro de pacientes e preenchimento da ficha até Dados Ginecológicos/Obstétricos'
    };
    return descricoes[cargo] || '';
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Cadastro realizado com sucesso!</h2>
          <p className="text-gray-600">O usuário foi cadastrado e receberá as permissões do cargo: <strong>{cargo}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onVoltar}
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
            <h1 className="text-2xl font-bold text-gray-800">Cadastrar {cargo}</h1>
            <p className="text-gray-600 text-sm">{getCargoDescricao()}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 w-full">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-[#1a4d2e] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <span className={`text-xs font-medium ${step >= 1 ? 'text-[#1a4d2e]' : 'text-gray-500'}`}>
                Dados Pessoais
              </span>
            </div>
            <div className="h-px bg-gray-300 flex-1 mx-2" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-[#1a4d2e] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className={`text-xs font-medium ${step >= 2 ? 'text-[#1a4d2e]' : 'text-gray-500'}`}>
                Dados Profissionais
              </span>
            </div>
            <div className="h-px bg-gray-300 flex-1 mx-2" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3 ? 'bg-[#1a4d2e] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
              <span className={`text-xs font-medium ${step >= 3 ? 'text-[#1a4d2e]' : 'text-gray-500'}`}>
                Endereço
              </span>
            </div>
            <div className="h-px bg-gray-300 flex-1 mx-2" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 4 ? 'bg-[#1a4d2e] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                4
              </div>
              <span className={`text-xs font-medium ${step >= 4 ? 'text-[#1a4d2e]' : 'text-gray-500'}`}>
                Credenciais
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 w-full">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nomeCompleto}
                onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent ${
                  errors.nomeCompleto ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Digite o nome completo"
              />
              {errors.nomeCompleto && (
                <p className="text-red-500 text-sm mt-1">{errors.nomeCompleto}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPF <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.cpf}
                onChange={(e) => handleInputChange('cpf', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent ${
                  errors.cpf ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="000.000.000-00"
                maxLength={14}
              />
              {errors.cpf && (
                <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-blue-800">
                <strong>Cargo selecionado:</strong> {cargo}
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onVoltar}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#2d7a4d] transition-colors"
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 w-full">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profissão <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.profissao}
                onChange={(e) => handleInputChange('profissao', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent ${
                  errors.profissao ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Digite a profissão"
              />
              {errors.profissao && (
                <p className="text-red-500 text-sm mt-1">{errors.profissao}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent ${
                    errors.telefone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                {errors.telefone && (
                  <p className="text-red-500 text-sm mt-1">{errors.telefone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="email@exemplo.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vínculo Empregatício <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.vinculoEmpregaticio}
                onChange={(e) => handleInputChange('vinculoEmpregaticio', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent ${
                  errors.vinculoEmpregaticio ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: Servidor público, CLT, Autônomo..."
              />
              {errors.vinculoEmpregaticio && (
                <p className="text-red-500 text-sm mt-1">{errors.vinculoEmpregaticio}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#2d7a4d] transition-colors"
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 w-full">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CEP <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => handleInputChange('cep', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent disabled:bg-gray-100 ${
                      errors.cep ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="00000-000"
                    maxLength={9}
                    disabled={cepLoading}
                  />
                  {cepLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="animate-spin text-[#1a4d2e]" size={20} />
                    </div>
                  )}
                </div>
                {cepError && (
                  <p className="text-red-500 text-sm mt-1">{cepError}</p>
                )}
                {errors.cep && (
                  <p className="text-red-500 text-sm mt-1">{errors.cep}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Município <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.municipio}
                  onChange={(e) => handleInputChange('municipio', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent ${
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
                Logradouro <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.logradouro}
                onChange={(e) => handleInputChange('logradouro', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent ${
                  errors.logradouro ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Rua, Avenida, etc."
              />
              {errors.logradouro && (
                <p className="text-red-500 text-sm mt-1">{errors.logradouro}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bairro <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.bairro}
                onChange={(e) => handleInputChange('bairro', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent ${
                  errors.bairro ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nome do bairro"
              />
              {errors.bairro && (
                <p className="text-red-500 text-sm mt-1">{errors.bairro}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.numero}
                  onChange={(e) => handleInputChange('numero', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent ${
                    errors.numero ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Número"
                />
                {errors.numero && (
                  <p className="text-red-500 text-sm mt-1">{errors.numero}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complemento
                </label>
                <input
                  type="text"
                  value={formData.complemento}
                  onChange={(e) => handleInputChange('complemento', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                  placeholder="Apto, Bloco, etc."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#2d7a4d] transition-colors"
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 w-full">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.senha}
                onChange={(e) => handleInputChange('senha', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent ${
                  errors.senha ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Digite a senha"
              />
              {errors.senha && (
                <p className="text-red-500 text-sm mt-1">{errors.senha}</p>
              )}
              <p className="text-gray-600 text-xs mt-1">Mínimo de 8 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Senha <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.confirmarSenha}
                onChange={(e) => handleInputChange('confirmarSenha', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent ${
                  errors.confirmarSenha ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Confirme a senha"
              />
              {errors.confirmarSenha && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmarSenha}</p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-yellow-800">
                <strong>Atenção:</strong> O usuário será criado com a flag "primeiro_acesso" ativa e deverá alterar a senha no primeiro login.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#2d7a4d] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Cadastrar
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
