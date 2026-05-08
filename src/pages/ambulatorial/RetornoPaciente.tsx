import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, FileDown, FileSpreadsheet } from 'lucide-react';
import { exportarCSV, exportarPDF } from '../../utils/exportUtils';
import { useAuth } from '../../contexts/AuthContext';

interface Paciente {
  id: number;
  nome_completo: string;
  cpf: string;
  cartao_sus: string;
  data_nascimento: string;
  celular: string;
  municipio: string;
}

export default function RetornoPaciente() {
  const navigate = useNavigate();
  const { permissoes } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [filteredPacientes, setFilteredPacientes] = useState<Paciente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPacientes();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = pacientes.filter(
        (p) =>
          p.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.cpf.includes(searchTerm) ||
          p.cartao_sus.includes(searchTerm)
      );
      setFilteredPacientes(filtered);
    } else {
      setFilteredPacientes(pacientes);
    }
  }, [searchTerm, pacientes]);

  const loadPacientes = async () => {
    try {
      const response = await fetch('/api/ambulatorial/pacientes');
      const data = await response.json();
      setPacientes(data || []);
      setFilteredPacientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPaciente = (pacienteId: number) => {
    navigate(`/ambulatorial/pacientes/${pacienteId}/consultas`);
  };

  const handleExportarCSV = () => {
    exportarCSV(filteredPacientes, 'retorno_pacientes.csv');
  };

  const handleExportarPDF = () => {
    exportarPDF(filteredPacientes, 'retorno_pacientes.pdf');
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Retorno Paciente</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar Paciente
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Nome, CPF ou Cartão SUS"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
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

        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredPacientes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">CPF</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cartão SUS</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Telefone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Município</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPacientes.map((paciente) => (
                  <tr key={paciente.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewPaciente(paciente.id)}>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">{paciente.nome_completo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{paciente.cpf || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{paciente.cartao_sus || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{paciente.celular || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{paciente.municipio || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPaciente(paciente.id);
                        }}
                        className="inline-flex items-center gap-2 text-[#2d7a4f] hover:text-[#236b43] font-medium"
                      >
                        <Eye size={18} />
                        Ver Consultas
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
