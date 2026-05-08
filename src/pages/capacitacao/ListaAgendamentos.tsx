import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, CheckCircle, XCircle, Clock, FileDown, FileSpreadsheet, Pencil, Trash2 } from 'lucide-react';
import { capacitacaoAPI } from '../../lib/api';
import { exportarAgendamentosCSV, exportarAgendamentosPDF } from '../../utils/exportUtils';
import Pagination from '../../components/Pagination';
import { useToast } from '../../contexts/ToastContext';

interface Agendamento {
  id: number;
  municipio: string;
  data_agendamento: string;
  plano_governanca: number;
  status: string;
  observacoes: string;
  created_at: string;
}

export default function ListaAgendamentos() {
  const navigate = useNavigate();
  const { success, error: toastError, warning, confirm } = useToast();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadAgendamentos();
  }, []);

  const loadAgendamentos = async () => {
    try {
      const data = await capacitacaoAPI.getAgendamentos();
      setAgendamentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmado':
      case 'realizado':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'cancelado':
        return <XCircle size={20} className="text-red-600" />;
      default:
        return <Clock size={20} className="text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'bg-blue-100 text-blue-800';
      case 'realizado':
        return 'bg-green-100 text-green-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const agendamentosFiltrados = agendamentos.filter((agendamento) =>
    agendamento.municipio.toLowerCase().includes(filtroMunicipio.toLowerCase())
  );

  const totalPages = Math.ceil(agendamentosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = agendamentosFiltrados.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (value: string) => {
    setFiltroMunicipio(value);
    setCurrentPage(1);
  };

  const handleExportarCSV = () => {
    exportarAgendamentosCSV(agendamentosFiltrados, 'agendamentos_municipios.csv');
  };

  const handleExportarPDF = () => {
    exportarAgendamentosPDF(agendamentosFiltrados, 'agendamentos_municipios.pdf');
  };

  const handleEditar = (id: number) => {
    navigate(`/capacitacao/agendamentos/${id}/editar`);
  };

  const handleExcluir = async (agendamento: Agendamento) => {
    if (agendamento.status === 'realizado') {
      warning('Agendamentos realizados não podem ser excluídos.');
      return;
    }

    const confirmado = await confirm(
      `Tem certeza que deseja excluir o agendamento do município ${agendamento.municipio} na data ${new Date(agendamento.data_agendamento).toLocaleDateString('pt-BR')}?`
    );

    if (!confirmado) return;

    try {
      await capacitacaoAPI.deleteAgendamento(agendamento.id.toString());
      success('Agendamento excluído com sucesso!');
      loadAgendamentos();
    } catch (error: any) {
      console.error('Erro ao excluir agendamento:', error);
      toastError(error.message || 'Erro ao excluir agendamento. Tente novamente.');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Agendamentos com Municípios</h1>
        <button
          onClick={() => navigate('/capacitacao/agendar-municipio')}
          className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          <Plus size={20} />
          Novo Agendamento
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Filtrar por município..."
            value={filtroMunicipio}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200">
          <button
            onClick={handleExportarPDF}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <FileDown size={18} />
            PDF
          </button>
          <button
            onClick={handleExportarCSV}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <FileSpreadsheet size={18} />
            Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : agendamentosFiltrados.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">Nenhum agendamento encontrado</p>
          <button
            onClick={() => navigate('/capacitacao/agendar-municipio')}
            className="mt-4 text-[#2d7a4f] hover:underline font-semibold"
          >
            Criar primeiro agendamento
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Município</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Data</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Plano de Governança</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Observações</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.map((agendamento) => (
                <tr key={agendamento.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {agendamento.municipio}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(agendamento.data_agendamento).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(agendamento.status)}
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(agendamento.status)}`}>
                        {agendamento.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {agendamento.plano_governanca ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        Sim
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
                        Não
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {agendamento.observacoes || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEditar(agendamento.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar agendamento"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleExcluir(agendamento)}
                        disabled={agendamento.status === 'realizado'}
                        className={`p-2 rounded-lg transition-colors ${
                          agendamento.status === 'realizado'
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title={
                          agendamento.status === 'realizado'
                            ? 'Agendamentos realizados não podem ser excluídos'
                            : 'Excluir agendamento'
                        }
                      >
                        <Trash2 size={18} />
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
    </div>
  );
}
