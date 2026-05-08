import { useState } from 'react';
import { useAuth, getDashboardRoute } from '../contexts/AuthContext';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { maskCPF } from '../utils/masks';
import Footer from '../components/Footer';

export default function Login() {
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCPF(e.target.value);
    setCpf(masked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const user = await login(cpf, senha);
      navigate(getDashboardRoute(user.cargo));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao fazer login');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#1a4d2e] to-[#2d7a4d] p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white p-3 rounded-xl">
                <img
                  src="/Estado.png"
                  alt="Brasão do Estado de Alagoas"
                  className="w-20 h-20 object-contain"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center">Sistema DeciDIU</h1>
            <p className="text-green-100 text-center mt-2">Acesse sua conta</p>
          </div>

          <div className="p-8">
            {erro && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{erro}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-2">
                  CPF
                </label>
                <input
                  id="cpf"
                  type="text"
                  value={cpf}
                  onChange={handleCpfChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent transition-all"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                  disabled={carregando}
                />
              </div>

              <div>
                <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent transition-all pr-12"
                    placeholder="Digite sua senha"
                    required
                    disabled={carregando}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    disabled={carregando}
                  >
                    {mostrarSenha ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="text-right mb-4">
                <Link
                  to="/recuperar-senha"
                  className="text-sm text-[#1a4d2e] hover:text-[#143d24] font-medium transition-colors"
                >
                  Esqueceu sua senha?
                </Link>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-gradient-to-r from-[#1a4d2e] to-[#2d7a4d] text-white py-3 px-4 rounded-lg font-medium hover:from-[#153d25] hover:to-[#236639] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {carregando ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Entrando...</span>
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center text-sm text-gray-600">
                <p className="mb-2">Credenciais padrão para teste:</p>
                <div className="bg-gray-50 rounded-lg p-3 text-left space-y-1">
                  <p><span className="font-medium">CPF:</span> 123.456.789-09</p>
                  <p><span className="font-medium">Senha:</span> Admin@123</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
