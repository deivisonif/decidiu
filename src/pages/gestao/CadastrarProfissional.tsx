import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, List } from 'lucide-react';
import FormularioCadastroUsuario from '../../components/FormularioCadastroUsuario';
import CadastrarInstrutoraAmbulatorial from '../ambulatorial/CadastrarInstrutora';

type Cargo =
  | 'Administrador'
  | 'Coordenador'
  | 'Responsável por Insumos'
  | 'Visitante'
  | 'Enfermeiro(a) Instrutor(a)'
  | 'Enfermeiro(a) Aluno(a)'
  | 'Recepcionista'
  | 'profissionais-ambulatorial'
  | '';

export default function CadastrarProfissional() {
  const [cargo, setCargo] = useState<Cargo>('');
  const navigate = useNavigate();

  const handleCargoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCargo(e.target.value as Cargo);
  };

  const renderFormulario = () => {
    if (!cargo) return null;
    if (cargo === 'profissionais-ambulatorial') {
      return <CadastrarInstrutoraAmbulatorial onVoltar={() => setCargo('')} />;
    }
    return <FormularioCadastroUsuario cargo={cargo} onVoltar={() => setCargo('')} />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {!cargo ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#1a4d2e] rounded-lg">
                    <UserPlus size={24} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">Cadastrar Profissional</h1>
                    <p className="text-gray-600 text-sm">Selecione o cargo/hierarquia do profissional que deseja cadastrar</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/gestao/profissionais')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <List size={18} />
                  Ver lista de profissionais
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cargo / Hierarquia <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={cargo}
                    onChange={handleCargoChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent text-base"
                  >
                    <option value="">Selecione um cargo</option>
                    <option value="Administrador">Administrador</option>
                    <option value="Coordenador">Coordenador</option>
                    <option value="profissionais-ambulatorial">Profissionais Ambulatorial</option>
                    <option value="Enfermeiro(a) Instrutor(a)">Enfermeiros(as) Instrutores(as)</option>
                    <option value="Enfermeiro(a) Aluno(a)">Enfermeiros(as) Alunos(as)</option>
                    <option value="Recepcionista">Recepcionista</option>
                    <option value="Responsável por Insumos">Responsável por Insumos</option>
                    <option value="Visitante">Visitante</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-blue-800">
                    <strong>Instruções:</strong> Após selecionar o cargo, você será direcionado para o formulário de cadastro correspondente. Todos os profissionais cadastrados aqui ficarão disponíveis na Lista de Profissionais e nos módulos correspondentes do sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          renderFormulario()
        )}
      </div>
    </div>
  );
}
