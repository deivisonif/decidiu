import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, FileDown, FileSpreadsheet, Calendar, X } from 'lucide-react';
import { distribuicaoAPI } from '../../lib/api';
import { exportarDistribuicaoMunicipiosCSV, exportarDistribuicaoMunicipiosPDF } from '../../utils/exportUtils';
import Pagination from '../../components/Pagination';

interface Municipio {
  id: number;
  nome: string;
  estado: string;
}

interface SolicitacoesPorMunicipio {
  municipio: string;
  totalSolicitacoes: number;
  totalAutorizadas: number;
  totalNaoAutorizadas: number;
  totalAguardando: number;
}

export default function DistribuicaoMunicipios() {
  const navigate = useNavigate();
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [resumoPorMunicipio, setResumoPorMunicipio] = useState<SolicitacoesPorMunicipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      let filtros = {};

      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        const dataInicio = `${year}-${month}-01`;
        const ultimoDia = new Date(parseInt(year), parseInt(month), 0).getDate();
        const dataFim = `${year}-${month}-${ultimoDia.toString().padStart(2, '0')}`;

        filtros = { dataInicio, dataFim };
      }

      const [municipiosData, solicitacoesData] = await Promise.all([
        distribuicaoAPI.getMunicipios(),
        distribuicaoAPI.getSolicitacoes(filtros),
      ]);

      setMunicipios(municipiosData || []);
      setSolicitacoes(solicitacoesData || []);

      const resumo = calcularResumoPorMunicipio(solicitacoesData || []);
      setResumoPorMunicipio(resumo);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularResumoPorMunicipio = (todasSolicitacoes: any[]): SolicitacoesPorMunicipio[] => {
    const resumoMap = new Map<string, SolicitacoesPorMunicipio>();

    todasSolicitacoes.forEach((sol) => {
      const municipioNome = sol.municipio_nome || 'Desconhecido';

      if (!resumoMap.has(municipioNome)) {
        resumoMap.set(municipioNome, {
          municipio: municipioNome,
          totalSolicitacoes: 0,
          totalAutorizadas: 0,
          totalNaoAutorizadas: 0,
          totalAguardando: 0,
        });
      }

      const resumo = resumoMap.get(municipioNome)!;
      resumo.totalSolicitacoes++;

      if (sol.status === 'Autorizado') {
        resumo.totalAutorizadas++;
      } else if (sol.status === 'Não autorizado') {
        resumo.totalNaoAutorizadas++;
      } else {
        resumo.totalAguardando++;
      }
    });

    return Array.from(resumoMap.values()).sort((a, b) => b.totalSolicitacoes - a.totalSolicitacoes);
  };

  const filteredMunicipios = resumoPorMunicipio.filter((item) =>
    item.municipio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredMunicipios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredMunicipios.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    setCurrentPage(1);
  };

  const clearMonthFilter = () => {
    setSelectedMonth('');
    setCurrentPage(1);
  };

  const formatMonthLabel = (monthValue: string) => {
    if (!monthValue) return '';
    const [year, month] = monthValue.split('-');
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${meses[parseInt(month) - 1]}/${year}`;
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <p className="text-gray-600">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/distribuicao')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-2">
              <MapPin size={32} className="text-[#2d7a4f]" />
              <h1 className="text-3xl font-bold text-gray-800">Distribuição por Município</h1>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                const periodoLabel = selectedMonth ? ` - ${formatMonthLabel(selectedMonth)}` : '';
                exportarDistribuicaoMunicipiosPDF(resumoPorMunicipio, `distribuicao_municipios${periodoLabel.replace(/\//g, '-')}.pdf`, periodoLabel);
              }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              <FileDown size={18} />
              PDF
            </button>
            <button
              onClick={() => {
                const periodoLabel = selectedMonth ? ` - ${formatMonthLabel(selectedMonth)}` : '';
                exportarDistribuicaoMunicipiosCSV(resumoPorMunicipio, `distribuicao_municipios${periodoLabel.replace(/\//g, '-')}.csv`, periodoLabel);
              }}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              <FileSpreadsheet size={18} />
              Excel
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <input
                type="text"
                placeholder="Buscar município..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                />
              </div>
              {selectedMonth && (
                <button
                  onClick={clearMonthFilter}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1"
                  title="Limpar filtro de mês"
                >
                  <X size={18} />
                  Limpar
                </button>
              )}
            </div>
          </div>

          {selectedMonth && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" />
                <span className="text-sm text-blue-800">
                  <strong>Período selecionado:</strong> {formatMonthLabel(selectedMonth)}
                </span>
              </div>
            </div>
          )}

          {filteredMunicipios.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">
                {searchTerm ? 'Nenhum município encontrado.' : 'Nenhum município com solicitações.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Município
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Solicitações
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Autorizadas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Não Autorizadas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aguardando
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.municipio}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.totalSolicitacoes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {item.totalAutorizadas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {item.totalNaoAutorizadas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                        {item.totalAguardando}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Dica:</strong> Esta tela mostra um resumo de todas as solicitações agrupadas por município.
            Use a busca para encontrar um município específico e o filtro de mês para visualizar dados de períodos específicos.
          </p>
        </div>
      </div>
    </div>
  );
}
