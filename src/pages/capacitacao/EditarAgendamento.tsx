import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { capacitacaoAPI } from '../../lib/api';
import { municipiosAlagoas } from '../../utils/municipios';
import { useToast } from '../../contexts/ToastContext';

export default function EditarAgendamento() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { success, error: toastError, warning } = useToast();
  const [formData, setFormData] = useState({
    municipio: '',
    data_agendamento: '',
    plano_governanca: false,
    status: 'agendado',
    observacoes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadAgendamento();
    }
  }, [id]);

  const loadAgendamento = async () => {
    try {
      const data = await capacitacaoAPI.getAgendamento(id!);
      setFormData({
        municipio: data.municipio,
        data_agendamento: data.data_agendamento,
        plano_governanca: Boolean(data.plano_governanca),
        status: data.status,
        observacoes: data.observacoes || '',
      });
    } catch (error) {
      console.error('Erro ao carregar agendamento:', error);
      toastError('Erro ao carregar agendamento. Tente novamente.');
      navigate('/capacitacao/agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.municipio || !formData.data_agendamento) {
      warning('Por favor, preencha os campos obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      await capacitacaoAPI.updateAgendamento(id!, formData);
      success('Agendamento atualizado com sucesso!');
      navigate('/capacitacao/agendamentos');
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      toastError('Erro ao atualizar agendamento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/capacitacao/agendamentos')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-gray-800">Editar Agendamento</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
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
              disabled={saving}
              className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
            >
              <Save size={20} />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
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
  );
}
