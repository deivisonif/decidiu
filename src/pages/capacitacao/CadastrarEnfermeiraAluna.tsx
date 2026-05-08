import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Upload, Loader2 } from 'lucide-react';
import { capacitacaoAPI } from '../../lib/api';
import { maskCPF, maskPhone, maskCEP } from '../../utils/masks';
import { municipiosAlagoas } from '../../utils/municipios';
import FormStepper from '../../components/FormStepper';
import { useCepAutocomplete } from '../../hooks/useCepAutocomplete';
import { useToast } from '../../contexts/ToastContext';

interface Instrutora {
  id: number;
  nome: string;
}

const steps = [
  { number: 1, name: 'Dados Pessoais' },
  { number: 2, name: 'Endereço' },
  { number: 3, name: 'Qualificações' },
];

export default function CadastrarEnfermeiraAluna() {
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [instrutoras, setInstrutoras] = useState<Instrutora[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    coren: '',
    telefone: '',
    email: '',
    municipio: '',
    cep: '',
    logradouro: '',
    bairro: '',
    numero: '',
    complemento: '',
    enfermeira_instrutora_id: '',
    certificado_filename: '',
    certificado_content: '',
  });
  const [loading, setLoading] = useState(false);
  const { loading: cepLoading, error: cepError, handleCepChange } = useCepAutocomplete();

  useEffect(() => {
    loadInstrutoras();
  }, []);

  const loadInstrutoras = async () => {
    try {
      const data = await capacitacaoAPI.getEnfermeirasInstrutoras();
      setInstrutoras(data || []);
    } catch (error) {
      console.error('Erro ao carregar instrutores(as):', error);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;

    if (name === 'cpf') {
      maskedValue = maskCPF(value);
    } else if (name === 'telefone') {
      maskedValue = maskPhone(value);
    } else if (name === 'cep') {
      maskedValue = maskCEP(value);
    }

    const updatedFormData = { ...formData, [name]: maskedValue };

    if (name === 'cep' && maskedValue.replace(/\D/g, '').length === 8) {
      const endereco = await handleCepChange(maskedValue);
      if (endereco) {
        updatedFormData.logradouro = endereco.logradouro || '';
        updatedFormData.bairro = endereco.bairro || '';
        if (endereco.municipio) {
          updatedFormData.municipio = endereco.municipio;
        }
      }
    }

    setFormData(updatedFormData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        warning('Por favor, selecione apenas arquivos PDF.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        warning('O arquivo deve ter no máximo 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result?.toString().split(',')[1] || '';
        setFormData({
          ...formData,
          certificado_filename: file.name,
          certificado_content: base64,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.nome || !formData.cpf || !formData.coren) {
        warning('Por favor, preencha os campos obrigatórios: Nome Completo, CPF e COREN.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateStep(currentStep)) return;

    if (!formData.nome || !formData.cpf || !formData.coren) {
      warning('Por favor, preencha os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const dataToInsert = {
        ...formData,
        enfermeira_instrutora_id: formData.enfermeira_instrutora_id || null,
      };

      await capacitacaoAPI.createEnfermeiraAluna(dataToInsert);
      success('Enfermeiro(a) Aluno(a) cadastrado(a) com sucesso!');
      navigate('/capacitacao/enfermeiras-alunas');
    } catch (error: any) {
      console.error('Erro ao cadastrar enfermeiro(a) aluno(a):', error);
      toastError(error.message || 'Erro ao cadastrar enfermeiro(a) aluno(a). Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-4">Dados Pessoais</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome Completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CPF <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="cpf"
              value={formData.cpf}
              onChange={handleInputChange}
              maxLength={14}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              COREN <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="coren"
              value={formData.coren}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <input
              type="text"
              name="telefone"
              value={formData.telefone}
              onChange={handleInputChange}
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
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-4">Endereço</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CEP
            </label>
            <div className="relative">
              <input
                type="text"
                name="cep"
                value={formData.cep}
                onChange={handleInputChange}
                maxLength={9}
                disabled={cepLoading}
                placeholder="00000-000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent disabled:bg-gray-100"
              />
              {cepLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="animate-spin text-[#2d7a4f]" size={20} />
                </div>
              )}
            </div>
            {cepError && (
              <p className="text-red-500 text-sm mt-1">{cepError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Município
            </label>
            <select
              name="municipio"
              value={formData.municipio}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            >
              <option value="">Selecione</option>
              {municipiosAlagoas.map((municipio) => (
                <option key={municipio} value={municipio}>
                  {municipio}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logradouro
            </label>
            <input
              type="text"
              name="logradouro"
              value={formData.logradouro}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bairro
            </label>
            <input
              type="text"
              name="bairro"
              value={formData.bairro}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número
            </label>
            <input
              type="text"
              name="numero"
              value={formData.numero}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Complemento
            </label>
            <input
              type="text"
              name="complemento"
              value={formData.complemento}
              onChange={handleInputChange}
              placeholder="Apartamento, casa..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-4">Qualificações</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enfermeiro(a) Instrutor(a)
          </label>
          <select
            name="enfermeira_instrutora_id"
            value={formData.enfermeira_instrutora_id}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent"
          >
            <option value="">Selecione um(a) instrutor(a)</option>
            {instrutoras.map((instrutora) => (
              <option key={instrutora.id} value={instrutora.id}>
                {instrutora.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Certificado (PDF)
          </label>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <Upload size={20} />
              <span>{formData.certificado_filename || 'Selecionar arquivo'}</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {formData.certificado_filename && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, certificado_filename: '', certificado_content: '' })}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Remover
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Máximo 5MB (opcional)</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/capacitacao/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-gray-800">Cadastrar Enfermeiro(a) Aluno(a)</h1>
      </div>

      <FormStepper steps={steps} currentStep={currentStep} />

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      <div className="flex gap-4 mt-6">
        {currentStep > 1 && (
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/capacitacao/dashboard')}
          className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>

        {currentStep < 3 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold transition-colors ml-auto"
          >
            Próxima Página
            <ArrowRight size={20} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 bg-[#2d7a4f] hover:bg-[#236b43] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors ml-auto"
          >
            <Save size={20} />
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        )}
      </div>
    </div>
  );
}
