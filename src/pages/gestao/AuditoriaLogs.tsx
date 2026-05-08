import { useState, useEffect, useCallback } from 'react';
import { Shield, Search, RefreshCw, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { gestaoAPI } from '../../lib/api';

interface LogAuditoria {
  id: number;
  usuario_id: number | null;
  usuario_nome: string | null;
  cargo_usuario: string | null;
  acao: string;
  modulo: string | null;
  tabela_afetada: string | null;
  registro_id: string | null;
  descricao: string | null;
  created_at: string;
}

const ACOES_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  recuperacao_senha: 'Recuperação de Senha',
  alteracao_senha: 'Alteração de Senha',
  redefinicao_senha_admin: 'Redefinição de Senha (Admin)',
  criacao_usuario: 'Cadastro de Usuário',
  edicao_profissional: 'Edição de Profissional',
  exclusao_profissional: 'Exclusão de Profissional',
  exclusao_usuario: 'Exclusão de Usuário',
  alteracao_hierarquia: 'Alteração de Perfil',
  alteracao_status: 'Alteração de Status',
  cadastro_paciente: 'Cadastro de Paciente',
  edicao_paciente: 'Edição de Paciente',
  registro_consulta: 'Registro de Consulta',
  registro_dados_clinicos: 'Dados Clínicos',
  exportacao_pdf: 'Exportação PDF',
  exportacao_excel: 'Exportação Excel',
  impressao_prontuario: 'Impressão de Prontuário',
};

const ACOES_CORES: Record<string, string> = {
  login: 'bg-green-100 text-green-800',
  logout: 'bg-gray-100 text-gray-700',
  recuperacao_senha: 'bg-yellow-100 text-yellow-800',
  alteracao_senha: 'bg-yellow-100 text-yellow-800',
  redefinicao_senha_admin: 'bg-orange-100 text-orange-800',
  criacao_usuario: 'bg-blue-100 text-blue-800',
  edicao_profissional: 'bg-blue-100 text-blue-700',
  exclusao_profissional: 'bg-red-100 text-red-800',
  exclusao_usuario: 'bg-red-100 text-red-800',
  alteracao_hierarquia: 'bg-orange-100 text-orange-800',
  alteracao_status: 'bg-yellow-100 text-yellow-700',
  cadastro_paciente: 'bg-teal-100 text-teal-800',
  edicao_paciente: 'bg-teal-100 text-teal-700',
  registro_consulta: 'bg-cyan-100 text-cyan-800',
  registro_dados_clinicos: 'bg-cyan-100 text-cyan-700',
  exportacao_pdf: 'bg-rose-100 text-rose-800',
  exportacao_excel: 'bg-emerald-100 text-emerald-800',
  impressao_prontuario: 'bg-violet-100 text-violet-800',
};

const MODULOS = ['Sistema', 'Gestão', 'Ambulatorial', 'Capacitação', 'Distribuição'];

const TODAS_ACOES = Object.keys(ACOES_LABELS);

function formatarDataHora(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  } catch {
    return iso;
  }
}

export default function AuditoriaLogs() {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);

  const perPage = 50;
  const totalPages = Math.ceil(total / perPage);

  const buscarLogs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await gestaoAPI.getLogsAuditoria({
        usuario: filtroUsuario || undefined,
        acao: filtroAcao || undefined,
        modulo: filtroModulo || undefined,
        data_inicio: filtroDataInicio || undefined,
        data_fim: filtroDataFim || undefined,
        page: p,
        per_page: perPage,
      });
      setLogs(res.logs || []);
      setTotal(res.total || 0);
      setPage(p);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filtroUsuario, filtroAcao, filtroModulo, filtroDataInicio, filtroDataFim]);

  useEffect(() => {
    buscarLogs(1);
  }, []);

  function aplicarFiltros(e: React.FormEvent) {
    e.preventDefault();
    setFiltrosAplicados(!!(filtroUsuario || filtroAcao || filtroModulo || filtroDataInicio || filtroDataFim));
    buscarLogs(1);
  }

  function limparFiltros() {
    setFiltroUsuario('');
    setFiltroAcao('');
    setFiltroModulo('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltrosAplicados(false);
    setTimeout(() => buscarLogs(1), 0);
  }

  return (
    <div className="p-4 sm:p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-800 rounded-lg">
          <Shield size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Trilha de Auditoria</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro imutável de todas as ações realizadas no sistema</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-5">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter size={15} />
            Filtros
            {filtrosAplicados && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-800 text-white text-xs font-semibold">
                Ativos
              </span>
            )}
          </div>
          <button
            onClick={() => buscarLogs(page)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        </div>

        <form onSubmit={aplicarFiltros} className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Usuário</label>
              <input
                type="text"
                value={filtroUsuario}
                onChange={e => setFiltroUsuario(e.target.value)}
                placeholder="Nome ou e-mail"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Ação</label>
              <select
                value={filtroAcao}
                onChange={e => setFiltroAcao(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="">Todas as ações</option>
                {TODAS_ACOES.map(a => (
                  <option key={a} value={a}>{ACOES_LABELS[a]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Módulo</label>
              <select
                value={filtroModulo}
                onChange={e => setFiltroModulo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="">Todos os módulos</option>
                {MODULOS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data Início</label>
              <input
                type="date"
                value={filtroDataInicio}
                onChange={e => setFiltroDataInicio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data Fim</label>
              <input
                type="date"
                value={filtroDataFim}
                onChange={e => setFiltroDataFim(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              type="submit"
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Search size={15} />
              Buscar
            </button>
            {filtrosAplicados && (
              <button
                type="button"
                onClick={limparFiltros}
                className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <X size={15} />
                Limpar Filtros
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Contagem */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          {loading ? 'Carregando...' : (
            <>
              <span className="font-semibold text-gray-800">{total.toLocaleString('pt-BR')}</span> registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
              {totalPages > 1 && ` — Página ${page} de ${totalPages}`}
            </>
          )}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => buscarLogs(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => buscarLogs(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw size={20} className="animate-spin mr-2" />
            Carregando registros...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Shield size={36} className="mb-3 opacity-30" />
            <p className="text-sm">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Data/Hora</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Usuário</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Perfil</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Ação</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Módulo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log, idx) => (
                  <tr key={log.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap font-mono">
                      {formatarDataHora(log.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-800">{log.usuario_nome || '—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-500">{log.cargo_usuario || '—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACOES_CORES[log.acao] || 'bg-gray-100 text-gray-700'}`}>
                        {ACOES_LABELS[log.acao] || log.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.modulo ? (
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {log.modulo}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-xs">
                      <span className="line-clamp-2">{log.descricao || '—'}</span>
                      {log.registro_id && (
                        <span className="text-gray-400 ml-1">(ID: {log.registro_id})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rodapé informativo */}
      <p className="mt-4 text-xs text-gray-400 flex items-center gap-1.5">
        <Shield size={12} />
        Os registros desta trilha são imutáveis e não podem ser editados ou excluídos por nenhum usuário do sistema.
      </p>
    </div>
  );
}
