import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, UserCheck, Eye, Edit, FileDown, FileSpreadsheet, Search } from 'lucide-react';
import { capacitacaoAPI } from '../../lib/api';
import Pagination from '../../components/Pagination';
import { exportarInstrutorasCSV, exportarInstrutorsPDF } from '../../utils/exportUtils';

interface Instrutora {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  especialidade: string;
  unidade_saude: string;
  total_dius: number;
}

export default function ListaEnfermeirasInstrutoras() {
  const navigate = useNavigate();
  const [instrutoras, setInstrutoras] = useState<Instrutora[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingInstrutora, setViewingInstrutora] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtro, setFiltro] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    loadInstrutoras();
  }, []);

  const loadInstrutoras = async () => {
    try {
      const data = await capacitacaoAPI.getEnfermeirasInstrutoras();
      setInstrutoras(data || []);
    } catch (error) {
      console.error('Erro ao carregar instrutoras:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id: number) => {
    try {
      const data = await capacitacaoAPI.getEnfermeiraInstrutora(id.toString());
      setViewingInstrutora(data);
    } catch (error) {
      console.error('Erro ao carregar instrutora:', error);
    }
  };

  const handleEdit = (id: number) => {
    navigate(`/capacitacao/editar-instrutora/${id}`);
  };

  const instrutorasFiltradas = instrutoras.filter((instrutora) => {
    if (!filtro) return true;
    const termo = filtro.toLowerCase();
    return (
      instrutora.nome.toLowerCase().includes(termo) ||
      instrutora.cpf.includes(termo)
    );
  });

  const totalPages = Math.ceil(instrutorasFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = instrutorasFiltradas.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Enfermeiros(as) Instrutores(as)</h1>
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => navigate('/capacitacao/cadastrar-instrutora')}
            className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <Plus size={20} />
            Novo(a) Instrutor(a)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : instrutoras.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <UserCheck size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">Nenhum(a) instrutor(a) cadastrado(a)</p>
          <button
            onClick={() => navigate('/capacitacao/cadastrar-instrutora')}
            className="mt-4 text-[#2d7a4f] hover:underline font-semibold"
          >
            Cadastrar primeiro(a) instrutor(a)
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={filtro}
                onChange={(e) => {
                  setFiltro(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              />
            </div>
          </div>

          {instrutorasFiltradas.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <UserCheck size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">Nenhum resultado encontrado para "{filtro}"</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nome</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">CPF</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Telefone</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Unidade de Saúde</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.map((instrutora) => (
                <tr key={instrutora.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {instrutora.nome}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {instrutora.cpf}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {instrutora.telefone || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {instrutora.email || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {instrutora.unidade_saude || '-'}
                  </td>
                  <td className="px-6 py-4">
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
          )}
        </>
      )}

      {viewingInstrutora && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Detalhes do(a) Instrutor(a)</h2>
            <div className="space-y-3">
              <div>
                <span className="font-semibold">Nome:</span> {viewingInstrutora.nome}
              </div>
              <div>
                <span className="font-semibold">CPF:</span> {viewingInstrutora.cpf}
              </div>
              <div>
                <span className="font-semibold">COREN:</span> {viewingInstrutora.coren || '-'}
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
    </div>
  );
}
