import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { capacitacaoAPI } from '../../lib/api';
import { maskCPF, maskPhone } from '../../utils/masks';
import { useToast } from '../../contexts/ToastContext';

interface Instrutora {
  id: number;
  nome: string;
}

export default function EditarAluna() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [instrutoras, setInstrutoras] = useState<Instrutora[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    coren: '',
    telefone: '',
    email: '',
    municipio: '',
    enfermeira_instrutora_id: ''
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [alunaData, instrutorasData] = await Promise.all([
        capacitacaoAPI.getEnfermeiraAluna(id!),
        capacitacaoAPI.getEnfermeirasInstrutoras()
      ]);

      setFormData({
        nome: alunaData.nome || '',
        cpf: alunaData.cpf || '',
        coren: alunaData.coren || '',
        telefone: alunaData.telefone || '',
        email: alunaData.email || '',
        municipio: alunaData.municipio || '',
        enfermeira_instrutora_id: alunaData.enfermeira_instrutora_id?.toString() || ''
      });
      setInstrutoras(instrutorasData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toastError('Erro ao carregar dados do(a) aluno(a).');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'cpf') {
      finalValue = maskCPF(value);
    } else if (name === 'telefone') {
      finalValue = maskPhone(value);
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await capacitacaoAPI.updateEnfermeiraAluna(id!, {
        ...formData,
        enfermeira_instrutora_id: formData.enfermeira_instrutora_id ? parseInt(formData.enfermeira_instrutora_id) : null
      });
      success('Aluno(a) atualizado(a) com sucesso!');
      navigate(`/capacitacao/aluna/${id}`);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toastError(error.message || 'Erro ao salvar dados.');
    } finally {
      setSaving(false);
    }
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
      <button
        onClick={() => navigate(`/capacitacao/aluna/${id}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={20} />
        Voltar
      </button>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Editar Enfermeira Aluna</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPF *
              </label>
              <input
                type="text"
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                required
                maxLength={14}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                COREN
              </label>
              <input
                type="text"
                name="coren"
                value={formData.coren}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <input
                type="text"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                maxLength={15}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Município
              </label>
              <input
                type="text"
                name="municipio"
                value={formData.municipio}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enfermeira Instrutora
              </label>
              <select
                name="enfermeira_instrutora_id"
                value={formData.enfermeira_instrutora_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              >
                <option value="">Selecione...</option>
                {instrutoras.map((instrutora) => (
                  <option key={instrutora.id} value={instrutora.id}>
                    {instrutora.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate(`/capacitacao/aluna/${id}`)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:bg-gray-400"
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
