import { useState, useEffect } from 'react';
import { Package, CheckCircle, XCircle, Clock, Filter, X, FileDown, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { distribuicaoAPI } from '../../lib/api';
import { exportToPDF, exportToExcel } from '../../utils/exportUtils';
import { useToast } from '../../contexts/ToastContext';

interface Stats {
  totalSolicitacoes: number;
  totalAutorizadas: number;
  totalNegadas: number;
  totalAguardando: number;
  totalDiusSolicitados: number;
  totalDiusAutorizados: number;
  totalImplanonsSolicitados: number;
  totalImplanonsAutorizados: number;
}

interface Municipio {
  id: number;
  nome: string;
  estado: string;
}

interface Solicitacao {
  id: number;
  municipio_id: number;
  tipo_insumo: string;
  quantidade_solicitada: number;
  quantidade_autorizada: number;
  status: string;
  data_solicitacao: string;
  motivo_negacao: string | null;
  municipio_nome: string;
}

interface ResumoStats {
  totalSolicitado: number;
  totalAutorizado: number;
  totalNaoAutorizado: number;
  percentualAprovacao: number;
}

interface MotivoNegacao {
  motivo: string;
  quantidade: number;
  percentual: number;
}

export default function DistribuicaoDashboard() {
  const { error: toastError } = useToast();
  const [stats, setStats] = useState<Stats>({
    totalSolicitacoes: 0,
    totalAutorizadas: 0,
    totalNegadas: 0,
    totalAguardando: 0,
    totalDiusSolicitados: 0,
    totalDiusAutorizados: 0,
    totalImplanonsSolicitados: 0,
    totalImplanonsAutorizados: 0,
  });
  const [loading, setLoading] = useState(true);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [mostrarRelatorios, setMostrarRelatorios] = useState(false);

  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    municipio: '',
    tipoInsumo: '',
    status: '',
  });

  const [resumo, setResumo] = useState<ResumoStats>({
    totalSolicitado: 0,
    totalAutorizado: 0,
    totalNaoAutorizado: 0,
    percentualAprovacao: 0,
  });

  const [motivosNegacao, setMotivosNegacao] = useState<MotivoNegacao[]>([]);
  const [municipiosComMaisNegativas, setMunicipiosComMaisNegativas] = useState<{ municipio: string; total: number }[]>([]);

  useEffect(() => {
    loadStats();
    loadMunicipios();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await distribuicaoAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMunicipios = async () => {
    try {
      const data = await distribuicaoAPI.getMunicipios();
      setMunicipios(data);
    } catch (error) {
      console.error('Erro ao carregar municípios:', error);
    }
  };

  const aplicarFiltros = async () => {
    setLoading(true);
    try {
      const data = await distribuicaoAPI.getSolicitacoes({
        dataInicio: filtros.dataInicio || undefined,
        dataFim: filtros.dataFim || undefined,
        municipio: filtros.municipio || undefined,
        tipoInsumo: filtros.tipoInsumo || undefined,
        status: filtros.status || undefined,
      });

      setSolicitacoes(data);
      calcularResumo(data);
      calcularMotivosNegacao(data);
      calcularMunicipiosComMaisNegativas(data);
      setMostrarRelatorios(true);
    } catch (error) {
      console.error('Erro ao aplicar filtros:', error);
      toastError('Erro ao carregar dados do relatório.');
    } finally {
      setLoading(false);
    }
  };

  const calcularResumo = (dados: Solicitacao[]) => {
    const totalSolicitado = dados.reduce((acc, item) => acc + item.quantidade_solicitada, 0);
    const totalAutorizado = dados
      .filter(item => item.status === 'Autorizado')
      .reduce((acc, item) => acc + (item.quantidade_autorizada || 0), 0);
    const totalNaoAutorizado = dados.filter(item => item.status === 'Não autorizado').length;
    const totalSolicitacoes = dados.length;
    const percentualAprovacao = totalSolicitacoes > 0
      ? ((dados.filter(item => item.status === 'Autorizado').length / totalSolicitacoes) * 100)
      : 0;

    setResumo({
      totalSolicitado,
      totalAutorizado,
      totalNaoAutorizado,
      percentualAprovacao,
    });
  };

  const calcularMotivosNegacao = (dados: Solicitacao[]) => {
    const negadas = dados.filter(item => item.status === 'Não autorizado' && item.motivo_negacao);
    const totalNegadas = negadas.length;

    const motivosMap = new Map<string, number>();
    negadas.forEach(item => {
      const motivo = item.motivo_negacao || 'Não informado';
      motivosMap.set(motivo, (motivosMap.get(motivo) || 0) + 1);
    });

    const motivosArray: MotivoNegacao[] = Array.from(motivosMap.entries()).map(([motivo, quantidade]) => ({
      motivo,
      quantidade,
      percentual: totalNegadas > 0 ? (quantidade / totalNegadas) * 100 : 0,
    }));

    motivosArray.sort((a, b) => b.quantidade - a.quantidade);
    setMotivosNegacao(motivosArray);
  };

  const calcularMunicipiosComMaisNegativas = (dados: Solicitacao[]) => {
    const negativas = dados.filter(item => item.status === 'Não autorizado');
    const municipiosMap = new Map<string, number>();

    negativas.forEach(item => {
      const municipio = item.municipio_nome || 'Desconhecido';
      municipiosMap.set(municipio, (municipiosMap.get(municipio) || 0) + 1);
    });

    const municipiosArray = Array.from(municipiosMap.entries())
      .map(([municipio, total]) => ({ municipio, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    setMunicipiosComMaisNegativas(municipiosArray);
  };

  const limparFiltros = () => {
    setFiltros({
      dataInicio: '',
      dataFim: '',
      municipio: '',
      tipoInsumo: '',
      status: '',
    });
    setSolicitacoes([]);
    setResumo({
      totalSolicitado: 0,
      totalAutorizado: 0,
      totalNaoAutorizado: 0,
      percentualAprovacao: 0,
    });
    setMotivosNegacao([]);
    setMunicipiosComMaisNegativas([]);
    setMostrarRelatorios(false);
  };

  const handleExportPDF = async () => {
    const dados = solicitacoes.map(item => ({
      'Município': item.municipio_nome || 'N/A',
      'Tipo de Insumo': item.tipo_insumo,
      'Qtd. Solicitada': item.quantidade_solicitada,
      'Qtd. Autorizada': item.quantidade_autorizada || 0,
      'Status': item.status,
      'Data': new Date(item.data_solicitacao).toLocaleDateString('pt-BR'),
      'Autorizado?': item.status === 'Autorizado' ? 'Sim' : 'Não',
    }));

    await exportToPDF(dados, 'relatorio_distribuicao_insumos', 'Relatório de Distribuição de Insumos');
  };

  const handleExportExcel = async () => {
    const dados = solicitacoes.map(item => ({
      'Município': item.municipio_nome || 'N/A',
      'Tipo de Insumo': item.tipo_insumo,
      'Qtd. Solicitada': item.quantidade_solicitada,
      'Qtd. Autorizada': item.quantidade_autorizada || 0,
      'Status': item.status,
      'Data': new Date(item.data_solicitacao).toLocaleDateString('pt-BR'),
      'Autorizado?': item.status === 'Autorizado' ? 'Sim' : 'Não',
    }));

    await exportToExcel(dados, 'relatorio_distribuicao_insumos');
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard de Distribuição</h1>
          <p className="text-gray-600">Gestão e controle de distribuição de insumos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total de Solicitações</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalSolicitacoes}</p>
              </div>
              <Package size={40} className="text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Autorizadas</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalAutorizadas}</p>
              </div>
              <CheckCircle size={40} className="text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Não Autorizadas</p>
                <p className="text-3xl font-bold text-red-600">{stats.totalNegadas}</p>
              </div>
              <XCircle size={40} className="text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Aguardando</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.totalAguardando}</p>
              </div>
              <Clock size={40} className="text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">DIU</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600">Solicitados</span>
                <span className="text-xl font-bold text-gray-800">{stats.totalDiusSolicitados}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Autorizados</span>
                <span className="text-xl font-bold text-green-600">{stats.totalDiusAutorizados}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Implanon</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600">Solicitados</span>
                <span className="text-xl font-bold text-gray-800">{stats.totalImplanonsSolicitados}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Autorizados</span>
                <span className="text-xl font-bold text-green-600">{stats.totalImplanonsAutorizados}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Filtros de Relatórios</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Município</label>
              <select
                value={filtros.municipio}
                onChange={(e) => setFiltros({ ...filtros, municipio: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              >
                <option value="">Todos</option>
                {municipios.map((mun) => (
                  <option key={mun.id} value={mun.id}>
                    {mun.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Insumo</label>
              <select
                value={filtros.tipoInsumo}
                onChange={(e) => setFiltros({ ...filtros, tipoInsumo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="DIU">DIU</option>
                <option value="Implanon">Implanon</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filtros.status}
                onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="Aguardando confirmação">Aguardando</option>
                <option value="Autorizado">Autorizado</option>
                <option value="Não autorizado">Não autorizado</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={aplicarFiltros}
              disabled={loading}
              className="bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Filter size={18} />
              {loading ? 'Carregando...' : 'Aplicar Filtros'}
            </button>

            <button
              onClick={limparFiltros}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <X size={18} />
              Limpar Filtros
            </button>

            <button
              onClick={handleExportPDF}
              disabled={solicitacoes.length === 0}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <FileDown size={18} />
              PDF
            </button>

            <button
              onClick={handleExportExcel}
              disabled={solicitacoes.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet size={18} />
              Excel
            </button>
          </div>
        </div>

        {mostrarRelatorios && solicitacoes.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Total Solicitado</p>
                    <p className="text-3xl font-bold text-gray-800">{resumo.totalSolicitado}</p>
                  </div>
                  <Package size={40} className="text-blue-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Total Autorizado</p>
                    <p className="text-3xl font-bold text-green-600">{resumo.totalAutorizado}</p>
                  </div>
                  <CheckCircle size={40} className="text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Total Não Autorizado</p>
                    <p className="text-3xl font-bold text-red-600">{resumo.totalNaoAutorizado}</p>
                  </div>
                  <XCircle size={40} className="text-red-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Taxa de Aprovação</p>
                    <p className="text-3xl font-bold text-[#2d7a4f]">{resumo.percentualAprovacao.toFixed(1)}%</p>
                  </div>
                  <TrendingUp size={40} className="text-[#2d7a4f]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Solicitações</h3>
                <p className="text-sm text-gray-600 mt-1">{solicitacoes.length} registros encontrados</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Município
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo de Insumo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qtd. Solicitada
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qtd. Autorizada
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data da Solicitação
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Foi Autorizado?
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {solicitacoes.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.municipio_nome || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.tipo_insumo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantidade_solicitada}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantidade_autorizada || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            item.status === 'Autorizado'
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'Não autorizado'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(item.data_solicitacao).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.status === 'Autorizado' ? (
                            <span className="text-green-600 font-medium">Sim</span>
                          ) : (
                            <span className="text-red-600 font-medium">Não</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {motivosNegacao.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Motivos de Não Autorização</h3>
                  <div className="space-y-3">
                    {motivosNegacao.map((motivo, index) => (
                      <div key={index} className="border-b border-gray-200 pb-3">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-medium text-gray-700">{motivo.motivo}</p>
                          <span className="text-sm font-bold text-gray-900">{motivo.quantidade}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${motivo.percentual}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{motivo.percentual.toFixed(1)}% das negativas</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Municípios com Maior Número de Negativas</h3>
                  <div className="space-y-3">
                    {municipiosComMaisNegativas.map((item, index) => (
                      <div key={index} className="flex justify-between items-center border-b border-gray-200 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                            {index + 1}
                          </span>
                          <p className="text-sm font-medium text-gray-700">{item.municipio}</p>
                        </div>
                        <span className="text-sm font-bold text-red-600">{item.total} negativas</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
