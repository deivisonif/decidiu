import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Eye, CreditCard as Edit, FileDown, FileSpreadsheet, Search } from 'lucide-react';
import { ambulatorialAPI } from '../../lib/api';
import { exportarInstrutorasCSV, exportarInstrutorsPDF } from '../../utils/exportUtils';
import { useAuth } from '../../contexts/AuthContext';


export default function ListaInstrutoras() {
  const navigate = useNavigate();
  const { permissoes } = useAuth();
  const [instrutoras, setInstrutoras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingInstrutora, setViewingInstrutora] = useState<any>(null);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    carregarInstrutoras();
  }, []);

  const carregarInstrutoras = async () => {
    setLoading(true);
    try {
      const data = await ambulatorialAPI.getEnfermeirasInstrutoras();
      setInstrutoras(data);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id: number) => {
    try {
      const data = await ambulatorialAPI.getEnfermeiraInstrutora(id.toString());
      setViewingInstrutora(data);
    } catch (error) {
      console.error('Erro ao carregar profissional:', error);
    }
  };

  const handleEdit = (id: number) => {
    navigate(`/ambulatorial/editar-profissional/${id}`);
  };

  const instrutorasFiltradas = instrutoras.filter((instrutora) => {
    if (!filtro) return true;
    const termo = filtro.toLowerCase();
    return (
      instrutora.nome.toLowerCase().includes(termo) ||
      instrutora.cpf.includes(termo)
    );
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Profissionais Ambulatorial</h1>
        <div className="flex gap-2">
          {!permissoes.apenasRecepcionista && (
            <>
              <button
                onClick={() => exportarInstrutorsPDF(instrutoras)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                <FileDown size={18} />
                PDF
              </button>
              <button
                onClick={() => exportarInstrutorasCSV(instrutoras)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                <FileSpreadsheet size={18} />
                Excel
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/ambulatorial/cadastrar-instrutora')}
            className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <UserPlus size={20} />
            Novo Profissional
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {instrutoras.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum profissional cadastrado
          </div>
        ) : instrutorasFiltradas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum resultado encontrado para "{filtro}"
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">CPF</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Registro</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Telefone</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Unidade de Saúde</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {instrutorasFiltradas.map((instrutora) => (
                  <tr key={instrutora.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{instrutora.nome}</td>
                    <td className="py-3 px-4">{instrutora.cpf}</td>
                    <td className="py-3 px-4">{instrutora.tipo_registro} {instrutora.numero_registro}</td>
                    <td className="py-3 px-4">{instrutora.telefone || '-'}</td>
                    <td className="py-3 px-4">{instrutora.email || '-'}</td>
                    <td className="py-3 px-4">{instrutora.unidade_saude || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleView(instrutora.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Visualizar"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(instrutora.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewingInstrutora && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Detalhes do Profissional</h2>
            <div className="space-y-3">
              <div>
                <span className="font-semibold">Nome:</span> {viewingInstrutora.nome}
              </div>
              <div>
                <span className="font-semibold">CPF:</span> {viewingInstrutora.cpf}
              </div>
              <div>
                <span className="font-semibold">Tipo de Registro:</span> {viewingInstrutora.tipo_registro}
              </div>
              <div>
                <span className="font-semibold">Número de Registro:</span> {viewingInstrutora.numero_registro}
              </div>
              <div>
                <span className="font-semibold">Telefone:</span> {viewingInstrutora.telefone || '-'}
              </div>
              <div>
                <span className="font-semibold">Email:</span> {viewingInstrutora.email || '-'}
              </div>
              <div>
                <span className="font-semibold">Especialidade:</span> {viewingInstrutora.especialidade || '-'}
              </div>
              <div>
                <span className="font-semibold">Unidade de Saúde:</span> {viewingInstrutora.unidade_saude || '-'}
              </div>
              {viewingInstrutora.diploma_filename && (
                <div>
                  <span className="font-semibold">Diploma:</span> {viewingInstrutora.diploma_filename}
                </div>
              )}
            </div>
            <button
              onClick={() => setViewingInstrutora(null)}
              className="mt-6 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <div className="text-sm text-gray-600 mt-4">
        {filtro ? (
          <>
            Exibindo {instrutorasFiltradas.length} de {instrutoras.length} {instrutoras.length === 1 ? 'profissional' : 'profissionais'}
          </>
        ) : (
          <>
            Total: {instrutoras.length} {instrutoras.length === 1 ? 'profissional' : 'profissionais'}
          </>
        )}
      </div>
    </div>
  );
}
