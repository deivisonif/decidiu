import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, CreditCard as Edit, Search, UserPlus, FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import { ambulatorialAPI } from '../../lib/api';
import { exportarCSV, exportarPDF } from '../../utils/exportUtils';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../contexts/AuthContext';

export default function ListaPacientes() {
  const navigate = useNavigate();
  const { permissoes } = useAuth();
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    carregarPacientes();
  }, [filtro]);

  const carregarPacientes = async () => {
    setLoading(true);
    try {
      const data = await ambulatorialAPI.getPacientesFiltrados(filtro);
      setPacientes(data);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const pacientesFiltrados = pacientes.filter(p => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      p.nome_completo?.toLowerCase().includes(termo) ||
      p.cpf?.includes(busca) ||
      p.cartao_sus?.includes(busca)
    );
  });

  const totalPages = Math.ceil(pacientesFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = pacientesFiltrados.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleBuscaChange = (value: string) => {
    setBusca(value);
    setCurrentPage(1);
  };

  const handleFiltroChange = (value: string) => {
    setFiltro(value);
    setCurrentPage(1);
  };

  const handleExportarCSV = () => {
    exportarCSV(pacientesFiltrados, 'pacientes_ambulatorial.csv');
  };

  const handleExportarPDF = () => {
    exportarPDF(pacientesFiltrados, 'pacientes_ambulatorial.pdf');
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Pacientes Ambulatorial</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => navigate('/ambulatorial/cadastrar-paciente')}
          className="flex items-center justify-center gap-3 bg-[#2d7a4f] hover:bg-[#236b43] text-white p-4 rounded-lg shadow-md transition-colors"
        >
          <UserPlus size={24} />
          <div className="text-left">
            <div className="font-semibold">Cadastrar Paciente</div>
            <div className="text-sm opacity-90">Adicionar nova paciente</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/ambulatorial/retorno-paciente')}
          className="flex items-center justify-center gap-3 bg-[#2d7a4f] hover:bg-[#236b43] text-white p-4 rounded-lg shadow-md transition-colors"
        >
          <FileText size={24} />
          <div className="text-left">
            <div className="font-semibold">Retorno Paciente</div>
            <div className="text-sm opacity-90">Buscar e visualizar ficha</div>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Paciente
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={busca}
                onChange={(e) => handleBuscaChange(e.target.value)}
                placeholder="Nome, CPF ou Cartão SUS"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              />
            </div>
          </div>

          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Inserção
            </label>
            <select
              value={filtro}
              onChange={(e) => handleFiltroChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            >
              <option value="todos">Todas</option>
              <option value="com_diu">Com DIU</option>
              <option value="com_implanon">Com Implanon</option>
              <option value="sem_insercao">Sem Inserção</option>
            </select>
          </div>
        </div>

        {!permissoes.apenasRecepcionista && (
          <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-gray-200">
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
        )}

        {pacientesFiltrados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma paciente encontrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">CPF</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Cartão SUS</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Município</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((paciente) => (
                  <tr key={paciente.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{paciente.nome_completo || '-'}</td>
                    <td className="py-3 px-4">{paciente.cpf || '-'}</td>
                    <td className="py-3 px-4">{paciente.cartao_sus || '-'}</td>
                    <td className="py-3 px-4">{paciente.municipio || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/ambulatorial/retorno-paciente?id=${paciente.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver Ficha"
                        >
                          <Eye size={20} />
                        </button>
                        <button
                          onClick={() => navigate(`/ambulatorial/cadastrar-paciente?id=${paciente.id}&modo=edicao`)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={20} />
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

      <div className="text-sm text-gray-600">
        Total: {pacientesFiltrados.length} {pacientesFiltrados.length === 1 ? 'paciente' : 'pacientes'}
      </div>
    </div>
  );
}
