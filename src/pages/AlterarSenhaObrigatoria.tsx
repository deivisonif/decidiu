import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validatePassword, getPasswordStrength } from '../utils/passwordValidation';
import { apiClient } from '../services/apiClient';

export default function AlterarSenhaObrigatoria() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  const primeiroAcesso = usuario?.primeiro_acesso === 1;
  const usandoProvisoria = (usuario as any)?.using_temporary;
  const senhaExpirada = (usuario as any)?.password_expired;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!usandoProvisoria && !senhaAtual && !primeiroAcesso) {
      setErro('Digite a senha atual');
      return;
    }

    const validacao = validatePassword(novaSenha);
    if (!validacao.isValid) {
      setErro(validacao.errors[0]);
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem');
      return;
    }

    try {
      setCarregando(true);

      console.log('[AlterarSenha] Enviando requisição para alterar senha...');
      console.log('[AlterarSenha] Usuario ID:', usuario?.id);

      const response = await apiClient.post('/auth/alterar-senha', {
        usuario_id: usuario?.id,
        senha_atual: senhaAtual || undefined,
        nova_senha: novaSenha,
      });

      console.log('[AlterarSenha] Resposta recebida:', response);

      if (!response.ok) {
        const mensagemErro = response.error?.message || 'Erro ao alterar senha. Tente novamente.';
        console.error('[AlterarSenha] Erro na resposta:', response.error);
        setErro(mensagemErro);
        return;
      }

      console.log('[AlterarSenha] Senha alterada com sucesso!');
      setSucesso('Senha alterada com sucesso! Redirecionando...');

      const usuarioAtualizado = {
        ...usuario,
        ...response.data?.usuario,
        primeiro_acesso: 0,
        must_change_password: 0,
      };

      localStorage.setItem('usuario', JSON.stringify(usuarioAtualizado));

      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error: any) {
      console.error('[AlterarSenha] Erro capturado:', error);
      const mensagemErro = error?.message || 'Erro inesperado ao alterar senha. Tente novamente.';
      setErro(mensagemErro);
    } finally {
      setCarregando(false);
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

  const getMotivoTroca = () => {
    if (primeiroAcesso) return 'É necessário alterar sua senha no primeiro acesso.';
    if (usandoProvisoria) return 'Você está usando uma senha provisória. É necessário criar uma senha definitiva.';
    if (senhaExpirada) return 'Sua senha expirou (90 dias). Por segurança, é necessário alterá-la.';
    return 'É necessário alterar sua senha antes de continuar.';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[#1a4d2e] rounded-full flex items-center justify-center">
              <Lock className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Alteração de Senha Obrigatória</h1>
          <p className="text-gray-600 text-sm">
            {getMotivoTroca()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-800">{erro}</p>
            </div>
          )}

          {sucesso && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">{sucesso}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!primeiroAcesso && !usandoProvisoria && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha Atual <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={mostrarSenhaAtual ? 'text' : 'password'}
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {mostrarSenhaAtual ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

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
                  required
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
                  <p className="text-xs text-gray-500 mt-2">
                    Mínimo: 8 caracteres, maiúsculas, minúsculas, números e símbolos
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Nova Senha <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={mostrarConfirmar ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {mostrarConfirmar ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full px-4 py-3 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#143d24] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {carregando ? 'Alterando senha...' : 'Alterar Senha e Continuar'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Por segurança, sua senha expira a cada 90 dias e precisará ser alterada novamente.
          </p>
        </div>
      </div>
    </div>
  );
}
