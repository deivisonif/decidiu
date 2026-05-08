import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { distribuicaoAPI } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

interface Municipio {
  id: number;
  nome: string;
}

export default function CadastroSolicitacao() {
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [formData, setFormData] = useState({
    municipio_id: '',
    tipo_insumo: '',
    quantidade_solicitada: '',
    quantidade_autorizada: '',
    observacao: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(true);

  useEffect(() => {
    loadMunicipios();
  }, []);

  const loadMunicipios = async () => {
    setLoadingMunicipios(true);
    try {
      const data = await distribuicaoAPI.getMunicipios();
      setMunicipios(data || []);
    } catch (error) {
      console.error('Erro ao carregar municípios:', error);
      toastError('Erro ao carregar lista de municípios.');
    } finally {
      setLoadingMunicipios(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.municipio_id || !formData.tipo_insumo || !formData.quantidade_solicitada) {
      warning('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const quantidade = parseInt(formData.quantidade_solicitada);
    if (isNaN(quantidade) || quantidade <= 0) {
      warning('Por favor, informe uma quantidade solicitada válida.');
      return;
    }

    const quantidadeAutorizada = formData.quantidade_autorizada ? parseInt(formData.quantidade_autorizada) : 0;
    if (formData.quantidade_autorizada && (isNaN(quantidadeAutorizada) || quantidadeAutorizada < 0)) {
      warning('Por favor, informe uma quantidade autorizada válida.');
      return;
    }

    setLoading(true);
    try {
      await distribuicaoAPI.createSolicitacao({
        municipio_id: parseInt(formData.municipio_id),
        tipo_insumo: formData.tipo_insumo,
        quantidade_solicitada: quantidade,
        quantidade_autorizada: quantidadeAutorizada,
        observacao: formData.observacao,
      });

      success('Solicitação enviada com sucesso!');
      navigate('/distribuicao/lista-espera');
    } catch (error: any) {
      console.error('Erro ao enviar solicitação:', error);
      toastError(error.message || 'Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/distribuicao')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Cadastro de Solicitação</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Município Destino *
                </label>
                <select
                  name="municipio_id"
                  value={formData.municipio_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                  required
                  disabled={loadingMunicipios}
                >
                  <option value="">
                    {loadingMunicipios ? 'Carregando municípios...' : 'Selecione um município'}
                  </option>
                  {!loadingMunicipios && municipios.length === 0 && (
                    <option disabled>Nenhum município encontrado</option>
                  )}
                  {municipios.map((municipio) => (
                    <option key={municipio.id} value={municipio.id}>
                      {municipio.nome}
                    </option>
                  ))}
                </select>
                {!loadingMunicipios && municipios.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{municipios.length} municípios disponíveis</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Insumo *
                </label>
                <select
                  name="tipo_insumo"
                  value={formData.tipo_insumo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                  required
                >
                  <option value="">Selecione o tipo</option>
                  <option value="DIU">DIU</option>
                  <option value="Implanon">Implanon</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade Solicitada *
                </label>
                <input
                  type="number"
                  name="quantidade_solicitada"
                  value={formData.quantidade_solicitada}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade Autorizada
                </label>
                <input
                  type="number"
                  name="quantidade_autorizada"
                  value={formData.quantidade_autorizada}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                  min="0"
                  placeholder="Deixe em branco se ainda não foi autorizado"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observação
              </label>
              <textarea
                name="observacao"
                value={formData.observacao}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
                placeholder="Digite observações adicionais (opcional)"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#2d7a4f] hover:bg-[#236b43] text-white py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save size={20} />
                {loading ? 'Enviando...' : 'Enviar Solicitação'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/distribuicao')}
                className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
