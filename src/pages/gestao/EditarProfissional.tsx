import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Key, Eye, EyeOff, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../lib/api';
import { maskCPF, maskPhone, maskCEP } from '../../utils/masks';
import { municipiosAlagoas } from '../../utils/municipios';
import { validatePassword, getPasswordStrength } from '../../utils/passwordValidation';
import { useCepAutocomplete } from '../../hooks/useCepAutocomplete';

interface Profissional {
  id: number;
  nome_completo: string;
  cpf: string;
  email: string;
  telefone: string;
  cargo: string;
  profissao?: string;
  municipio?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
}

const cargosDisponiveis = [
  'Administrador',
  'Coordenador',
  'Médico(a) / Enfermeiro(a) Ambulatorial',
  'Enfermeiro(a) Instrutor(a)',
  'Enfermeiro(a) Aluno(a)',
  'Responsável por Insumos',
  'Visitante',
];

export default function EditarProfissional() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { usuario, permissoes } = useAuth();
  const { success, error: toastError, warning } = useToast();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [formData, setFormData] = useState<Partial<Profissional>>({});
  const [showRedefinirSenhaModal, setShowRedefinirSenhaModal] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarNovaSenha, setMostrarConfirmarNovaSenha] = useState(false);
  const [erroRedefinicao, setErroRedefinicao] = useState('');
  const [redefinindo, setRedefinindo] = useState(false);
  const { loading: cepLoading, error: cepError, handleCepChange } = useCepAutocomplete();

  useEffect(() => {
    if (!permissoes.podeEditarProfissionais) {
      toastError('Você não tem permissão para editar profissionais.');
      navigate('/gestao/profissionais');
      return;
    }

    carregarProfissional();
  }, [id]);

  const carregarProfissional = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/profissionais/${id}`);

      // Coordenador só pode editar usuários da área de capacitação
      if (permissoes.podeEditarApenasCapacitacao) {
        const cargosPermitidos = ['Enfermeiro(a) Instrutor(a)', 'Enfermeiro(a) Aluno(a)'];
        if (!cargosPermitidos.includes(data.cargo)) {
          toastError('Você só pode editar perfis de Enfermeiras Instrutoras e Alunas vinculadas às capacitações.');
          navigate('/gestao/profissionais');
          return;
        }
      }

      setProfissional(data);
      setFormData(data);
    } catch (error: any) {
      console.error('Erro ao carregar profissional:', error);
      toastError('Erro ao carregar dados do profissional.');
      navigate('/gestao/profissionais');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === 'cpf') {
      processedValue = maskCPF(value);
    } else if (name === 'telefone') {
      processedValue = maskPhone(value);
    } else if (name === 'cep') {
      processedValue = maskCEP(value);
    }

    const updatedFormData = { ...formData, [name]: processedValue };

    if (name === 'cep' && processedValue.replace(/\D/g, '').length === 8) {
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
  };

  const handleSalvar = async () => {
    if (!formData.nome_completo || !formData.cpf || !formData.email) {
      warning('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setSalvando(true);
      await api.put(`/profissionais/${id}`, {
        ...formData,
        usuario_id: usuario?.id,
      });

      success('Profissional atualizado com sucesso!');
      navigate('/gestao/profissionais');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toastError(error.message || 'Erro ao atualizar profissional. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const handleRedefinirSenha = async () => {
    setErroRedefinicao('');

    const validacao = validatePassword(novaSenha);
    if (!validacao.isValid) {
      setErroRedefinicao(validacao.errors[0]);
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setErroRedefinicao('As senhas não coincidem');
      return;
    }

    try {
      setRedefinindo(true);
      await api.post(`/auth/redefinir-senha/${id}`, {
        nova_senha: novaSenha,
        usuario_id: usuario?.id,
      });

      success('Senha redefinida com sucesso! O usuário deverá alterá-la no próximo login.');
      setShowRedefinirSenhaModal(false);
      setNovaSenha('');
      setConfirmarNovaSenha('');
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      setErroRedefinicao(error.message || 'Erro ao redefinir senha. Tente novamente.');
    } finally {
      setRedefinindo(false);
    }
  };

  const forcaSenha = getPasswordStrength(novaSenha);

  const getForcaColor = () => {
    if (forcaSenha <= 25) return 'bg-red-500';
    if (forcaSenha <= 50) return 'bg-orange-500';
    if (forcaSenha <= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getForcaTexto = () => {
    if (forcaSenha <= 25) return 'Muito fraca';
    if (forcaSenha <= 50) return 'Fraca';
    if (forcaSenha <= 75) return 'Média';
    return 'Forte';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!profissional) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/gestao/profissionais')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft size={20} />
            Voltar para Lista de Profissionais
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Editar Profissional</h1>
          <p className="text-gray-600 text-sm mt-1">Atualize os dados cadastrais do profissional</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Dados Pessoais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nome_completo"
                    value={formData.nome_completo || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    value={maskCPF(formData.cpf || '')}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData(prev => ({ ...prev, cpf: value }));
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                    maxLength={14}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="text"
                    name="telefone"
                    value={maskPhone(formData.telefone || '')}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData(prev => ({ ...prev, telefone: value }));
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                    maxLength={15}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profissão
                  </label>
                  <input
                    type="text"
                    name="profissao"
                    value={formData.profissao || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                  />
                </div>

                {permissoes.podeGerenciarHierarquia && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cargo/Função
                    </label>
                    <select
                      name="cargo"
                      value={formData.cargo || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                    >
                      {cargosDisponiveis.map((cargo) => (
                        <option key={cargo} value={cargo}>
                          {cargo}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Apenas administradores podem alterar o cargo
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Endereço Profissional</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Município
                  </label>
                  <select
                    name="municipio"
                    value={formData.municipio || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                  >
                    <option value="">Selecione um município</option>
                    {municipiosAlagoas.map((municipio) => (
                      <option key={municipio} value={municipio}>
                        {municipio}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CEP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="cep"
                      value={formData.cep || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent disabled:bg-gray-100"
                      maxLength={9}
                      disabled={cepLoading}
                      placeholder="00000-000"
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    name="logradouro"
                    value={formData.logradouro || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número
                  </label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complemento
                  </label>
                  <input
                    type="text"
                    name="complemento"
                    value={formData.complemento || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bairro
                  </label>
                  <input
                    type="text"
                    name="bairro"
                    value={formData.bairro || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {permissoes.podeGerenciarHierarquia && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowRedefinirSenhaModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Key size={20} />
                  Redefinir Senha
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  O usuário será obrigado a alterar a senha no próximo login
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#143d24] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button
                onClick={() => navigate('/gestao/profissionais')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      {showRedefinirSenhaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Redefinir Senha</h3>
                <button
                  onClick={() => {
                    setShowRedefinirSenhaModal(false);
                    setNovaSenha('');
                    setConfirmarNovaSenha('');
                    setErroRedefinicao('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  Após redefinir, o usuário <strong>{profissional?.nome_completo}</strong> será obrigado a alterar a senha no próximo login.
                </p>
              </div>

              {erroRedefinicao && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{erroRedefinicao}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={mostrarNovaSenha ? 'text' : 'password'}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {mostrarNovaSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {novaSenha && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Força da senha:</span>
                        <span className="font-medium">{getForcaTexto()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getForcaColor()}`}
                          style={{ width: `${forcaSenha}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Nova Senha <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={mostrarConfirmarNovaSenha ? 'text' : 'password'}
                      value={confirmarNovaSenha}
                      onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmarNovaSenha(!mostrarConfirmarNovaSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {mostrarConfirmarNovaSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleRedefinirSenha}
                    disabled={redefinindo || !novaSenha || !confirmarNovaSenha}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {redefinindo ? 'Redefinindo...' : 'Redefinir Senha'}
                  </button>
                  <button
                    onClick={() => {
                      setShowRedefinirSenhaModal(false);
                      setNovaSenha('');
                      setConfirmarNovaSenha('');
                      setErroRedefinicao('');
                    }}
                    className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
