import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Key, ArrowLeft, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { maskCPF } from '../utils/masks';

export default function RecuperarSenha() {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [senhaProvisoria, setSenhaProvisoria] = useState('');
  const [validadeHoras, setValidadeHoras] = useState(0);
  const [expiraEm, setExpiraEm] = useState('');
  const [copiado, setCopiado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    const cpfLimpo = cpf.replace(/\D/g, '');

    if (cpfLimpo.length !== 11) {
      setErro('CPF inválido');
      return;
    }

    if (!dataNascimento) {
      setErro('Data de nascimento é obrigatória');
      return;
    }

    try {
      setCarregando(true);
      const response = await fetch('/api/auth/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: cpfLimpo,
          data_nascimento: dataNascimento,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao recuperar senha');
      }

      setSenhaProvisoria(data.senha_provisoria);
      setValidadeHoras(data.validade_horas);
      setExpiraEm(data.expira_em);
    } catch (error: any) {
      setErro(error.message || 'Erro ao recuperar senha. Verifique os dados informados.');
    } finally {
      setCarregando(false);
    }
  };

  const copiarSenha = () => {
    navigator.clipboard.writeText(senhaProvisoria);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (senhaProvisoria) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="text-white" size={32} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Senha Provisória Gerada!</h1>
            <p className="text-gray-600 text-sm">
              Use esta senha para fazer login. Você será solicitado a criar uma senha definitiva.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Sua Senha Provisória:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-lg font-mono font-bold text-blue-700 bg-white px-3 py-2 rounded border border-blue-300 break-all">
                  {senhaProvisoria}
                </code>
                <button
                  onClick={copiarSenha}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
                  title="Copiar senha"
                >
                  <Copy size={20} />
                </button>
              </div>
              {copiado && (
                <p className="text-xs text-green-600 mt-2">Senha copiada!</p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-900 mb-2">Importante:</p>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>Esta senha é válida por {validadeHoras} horas</li>
                <li>Expira em: {expiraEm}</li>
                <li>Pode ser usada apenas uma vez</li>
                <li>Após o login, você deverá criar uma senha definitiva</li>
              </ul>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full px-4 py-3 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#143d24] transition-colors font-medium"
              >
                Ir para Login
              </button>
              <button
                onClick={() => {
                  setSenhaProvisoria('');
                  setCpf('');
                  setDataNascimento('');
                }}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Gerar Nova Senha
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[#1a4d2e] rounded-full flex items-center justify-center">
              <Key className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Recuperar Senha</h1>
          <p className="text-gray-600 text-sm">
            Informe seu CPF e data de nascimento para gerar uma senha provisória
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-800">{erro}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPF <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={maskCPF(cpf)}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Nascimento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full px-4 py-3 bg-[#1a4d2e] text-white rounded-lg hover:bg-[#143d24] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {carregando ? 'Verificando...' : 'Recuperar Senha'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={16} />
              Voltar para Login
            </Link>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 font-medium mb-2">Como funciona:</p>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Informe seu CPF e data de nascimento</li>
            <li>Uma senha provisória será gerada</li>
            <li>Use a senha provisória para fazer login</li>
            <li>Crie uma senha definitiva quando solicitado</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
