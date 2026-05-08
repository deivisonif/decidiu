import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { capacitacaoAPI } from '../../lib/api';
import { municipiosAlagoas } from '../../utils/municipios';
import { useToast } from '../../contexts/ToastContext';

export default function AgendarMunicipio() {
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();
  const [formData, setFormData] = useState({
    municipio: '',
    data_agendamento: '',
    plano_governanca: false,
    status: 'agendado',
    observacoes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.municipio || !formData.data_agendamento) {
      warning('Por favor, preencha os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      await capacitacaoAPI.createAgendamento(formData);
      success('Agendamento criado com sucesso!');
      navigate('/capacitacao/agendamentos');
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toastError('Erro ao criar agendamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/capacitacao/agendamentos')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-gray-800">Agendar com Município</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Município <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.municipio}
              onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              required
            >
              <option value="">Selecione</option>
              {municipiosAlagoas.map((municipio) => (
                <option key={municipio} value={municipio}>
                  {municipio}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data do Agendamento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.data_agendamento}
              onChange={(e) => setFormData({ ...formData, data_agendamento: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            >
              <option value="agendado">Agendado</option>
              <option value="confirmado">Confirmado</option>
              <option value="realizado">Realizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="plano_governanca"
              checked={formData.plano_governanca}
              onChange={(e) => setFormData({ ...formData, plano_governanca: e.target.checked })}
              className="w-5 h-5 text-[#2d7a4f] border-gray-300 rounded focus:ring-[#2d7a4f]"
            />
            <label htmlFor="plano_governanca" className="text-sm font-medium text-gray-700">
              Está no Plano de Governança
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
            >
              <Save size={20} />
              {loading ? 'Salvando...' : 'Salvar Agendamento'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/capacitacao/agendamentos')}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
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
