import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Eye, File as FileEdit, FileDown, FileSpreadsheet } from 'lucide-react';
import { capacitacaoAPI } from '../../lib/api';
import Pagination from '../../components/Pagination';
import { exportarPacientesCapacitacaoCSV, exportarPacientesCapacitacaoPDF } from '../../utils/exportUtils';
import { useToast } from '../../contexts/ToastContext';

interface Paciente {
  id: number;
  nome_completo: string;
  cpf: string;
  cartao_sus: string;
  data_nascimento: string;
  municipio: string;
  created_at: string;
}

export default function ListaPacientesCapacitacao() {
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroNome, setFiltroNome] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadPacientes();
  }, []);

  const loadPacientes = async () => {
    try {
      const data = await capacitacaoAPI.getPacientes();
      setPacientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNovoPaciente = async () => {
    try {
      const data = await capacitacaoAPI.createPaciente();
      navigate(`/capacitacao/cadastrar-paciente/${data.id}`);
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      toastError('Erro ao criar novo paciente.');
    }
  };

  const pacientesFiltrados = pacientes.filter((paciente) =>
    paciente.nome_completo?.toLowerCase().includes(filtroNome.toLowerCase())
  );

  const totalPages = Math.ceil(pacientesFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = pacientesFiltrados.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (value: string) => {
    setFiltroNome(value);
    setCurrentPage(1);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Pacientes de Capacitação</h1>
        <button
          onClick={handleNovoPaciente}
          className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          <Plus size={20} />
          Novo Paciente
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Filtrar por nome..."
            value={filtroNome}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200">
          <button
            onClick={() => exportarPacientesCapacitacaoPDF(pacientesFiltrados)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <FileDown size={18} />
            PDF
          </button>
          <button
            onClick={() => exportarPacientesCapacitacaoCSV(pacientesFiltrados)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <FileSpreadsheet size={18} />
            Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : pacientesFiltrados.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">Nenhum paciente cadastrado</p>
          <button
            onClick={handleNovoPaciente}
            className="mt-4 text-[#2d7a4f] hover:underline font-semibold"
          >
            Cadastrar primeiro paciente
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nome</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">CPF</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Cartão SUS</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Data de Nascimento</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Município</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.map((paciente) => (
                <tr key={paciente.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {paciente.nome_completo || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {paciente.cpf || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {paciente.cartao_sus || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {paciente.data_nascimento
                      ? new Date(paciente.data_nascimento).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {paciente.municipio || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => navigate(`/capacitacao/registrar-atendimento/${paciente.id}`)}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        title="Registrar Atendimento"
                      >
                        <FileEdit size={16} />
                        Registrar
                      </button>
                      <button
                        onClick={() => navigate(`/capacitacao/prontuario/${paciente.id}`)}
                        className="inline-flex items-center gap-2 text-[#2d7a4f] hover:text-[#236b43] font-medium transition-colors"
                        title="Ver Prontuário"
                      >
                        <Eye size={16} />
                        Prontuário
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
