import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowLeft, FileDown, FileSpreadsheet } from 'lucide-react';
import { distribuicaoAPI } from '../../lib/api';
import { exportarSolicitacoesCSV, exportarSolicitacoesPDF } from '../../utils/exportUtils';
import Pagination from '../../components/Pagination';
import { useToast } from '../../contexts/ToastContext';

interface Solicitacao {
  id: number;
  municipio_id: number;
  municipio_nome: string;
  tipo_insumo: string;
  quantidade_solicitada: number;
  quantidade_autorizada: number;
  data_solicitacao: string;
  status: string;
  nome_solicitante: string;
  observacao: string;
  motivo_negacao: string;
  respondido_por: string;
}

export default function ListaEspera() {
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<number | null>(null);
  const [quantidadeAutorizada, setQuantidadeAutorizada] = useState('');
  const [motivoNegacao, setMotivoNegacao] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [isAutorizar, setIsAutorizar] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadSolicitacoes();
  }, []);

  const loadSolicitacoes = async () => {
    try {
      const data = await distribuicaoAPI.getSolicitacoes();
      setSolicitacoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutorizarClick = (solicitacao: Solicitacao) => {
    setSelectedSolicitacao(solicitacao.id);
    setQuantidadeAutorizada(solicitacao.quantidade_solicitada.toString());
    setNomeResponsavel('');
    setIsAutorizar(true);
    setShowModal(true);
  };

  const handleNegarClick = (id: number) => {
    setSelectedSolicitacao(id);
    setMotivoNegacao('');
    setNomeResponsavel('');
    setIsAutorizar(false);
    setShowModal(true);
  };

  const handleConfirm = async () => {
    if (!selectedSolicitacao) return;

    if (!nomeResponsavel.trim()) {
      warning('Por favor, informe o nome do responsável pela decisão.');
      return;
    }

    if (isAutorizar) {
      const qtd = parseInt(quantidadeAutorizada);
      if (isNaN(qtd) || qtd <= 0) {
        warning('Por favor, informe uma quantidade válida.');
        return;
      }

      try {
        await distribuicaoAPI.updateSolicitacao(selectedSolicitacao.toString(), {
          status: 'Autorizado',
          quantidade_autorizada: qtd,
          respondido_por: nomeResponsavel,
        });

        success('Solicitação autorizada com sucesso!');
        setShowModal(false);
        setSelectedSolicitacao(null);
        setQuantidadeAutorizada('');
        setNomeResponsavel('');
        loadSolicitacoes();
      } catch (error: any) {
        console.error('Erro ao autorizar:', error);
        toastError(error.message || 'Erro ao autorizar solicitação.');
      }
    } else {
      if (!motivoNegacao.trim()) {
        warning('Por favor, informe o motivo da não autorização.');
        return;
      }

      try {
        await distribuicaoAPI.updateSolicitacao(selectedSolicitacao.toString(), {
          status: 'Não autorizado',
          quantidade_autorizada: 0,
          motivo_negacao: motivoNegacao,
          respondido_por: nomeResponsavel,
        });

        success('Solicitação negada com sucesso!');
        setShowModal(false);
        setSelectedSolicitacao(null);
        setMotivoNegacao('');
        setNomeResponsavel('');
        loadSolicitacoes();
      } catch (error: any) {
        console.error('Erro ao negar:', error);
        toastError(error.message || 'Erro ao negar solicitação.');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Autorizado':
        return 'bg-green-100 text-green-800';
      case 'Não autorizado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const totalPages = Math.ceil(solicitacoes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = solicitacoes.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <p className="text-gray-600">Carregando solicitações...</p>
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
            <h1 className="text-3xl font-bold text-gray-800">Lista de Espera</h1>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => exportarSolicitacoesPDF(solicitacoes)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              <FileDown size={18} />
              PDF
            </button>
            <button
              onClick={() => exportarSolicitacoesCSV(solicitacoes)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              <FileSpreadsheet size={18} />
              Excel
            </button>
          </div>
        </div>

        {solicitacoes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600">Nenhuma solicitação encontrada.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Município
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tipo de Insumo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Qtd. Solicitada
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Qtd. Autorizada
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Liberado por
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((solicitacao) => (
                    <tr key={solicitacao.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {solicitacao.municipio_nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {solicitacao.tipo_insumo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {solicitacao.quantidade_solicitada}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {solicitacao.quantidade_autorizada || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(solicitacao.data_solicitacao).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {solicitacao.respondido_por || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(solicitacao.status)}`}>
                          {solicitacao.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {solicitacao.status === 'Aguardando confirmação' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAutorizarClick(solicitacao)}
                              className="text-green-600 hover:text-green-800"
                              title="Autorizar"
                            >
                              <CheckCircle size={20} />
                            </button>
                            <button
                              onClick={() => handleNegarClick(solicitacao.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Não Autorizar"
                            >
                              <XCircle size={20} />
                            </button>
                          </div>
                        )}
                        {solicitacao.status === 'Não autorizado' && solicitacao.motivo_negacao && (
                          <span className="text-xs text-gray-500" title={solicitacao.motivo_negacao}>
                            Ver motivo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {isAutorizar ? 'Autorizar Solicitação' : 'Não Autorizar Solicitação'}
            </h3>

            {isAutorizar ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade Autorizada *
                  </label>
                  <input
                    type="number"
                    value={quantidadeAutorizada}
                    onChange={(e) => setQuantidadeAutorizada(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                    min="1"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Responsável pela Autorização *
                  </label>
                  <input
                    type="text"
                    value={nomeResponsavel}
                    onChange={(e) => setNomeResponsavel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                    placeholder="Digite seu nome completo"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo da Não Autorização *
                  </label>
                  <textarea
                    value={motivoNegacao}
                    onChange={(e) => setMotivoNegacao(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Responsável pela Não Autorização *
                  </label>
                  <input
                    type="text"
                    value={nomeResponsavel}
                    onChange={(e) => setNomeResponsavel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                    placeholder="Digite seu nome completo"
                    required
                  />
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                className={`flex-1 ${
                  isAutorizar
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white py-2 px-4 rounded-lg font-medium transition-colors`}
              >
                {isAutorizar ? 'Autorizar' : 'Não Autorizar'}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedSolicitacao(null);
                  setQuantidadeAutorizada('');
                  setMotivoNegacao('');
                  setNomeResponsavel('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
