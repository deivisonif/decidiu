import { useState, useEffect } from 'react';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationPanel from './NotificationPanel';
import { capacitacaoAPI } from '../lib/api';

const CARGOS_COM_NOTIFICACOES = ['Administrador', 'Coordenador', 'Enfermeiro(a) Instrutor(a)'] as const;

interface HeaderProps {
  userName: string;
  onMenuToggle?: () => void;
}

interface Notification {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  agendamento_id: number;
  dias_restantes: number;
  lida: boolean;
  created_at: string;
  municipio: string;
  data_agendamento: string;
}

export default function Header({ userName, onMenuToggle }: HeaderProps) {
  const { logout, usuario } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const podeVerNotificacoes = usuario
    ? (CARGOS_COM_NOTIFICACOES as readonly string[]).includes(usuario.cargo)
    : false;

  const fetchNotifications = async () => {
    if (!podeVerNotificacoes) return;
    try {
      const data = await capacitacaoAPI.getNotificacoes();
      setNotifications(data);
      const countData = await capacitacaoAPI.getNotificacoesCount();
      setUnreadCount(countData.count);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };

  useEffect(() => {
    if (!podeVerNotificacoes) return;
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [podeVerNotificacoes]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await capacitacaoAPI.marcarNotificacaoLida(id);
      await fetchNotifications();
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await capacitacaoAPI.marcarTodasLidas();
      await fetchNotifications();
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center gap-4 lg:justify-end">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded hover:bg-gray-100 text-gray-600"
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>
      <div className="flex items-center gap-2">
        {podeVerNotificacoes && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 hover:bg-gray-100 rounded relative transition-all ${
                unreadCount > 0 ? 'animate-pulse' : ''
              }`}
            >
              <Bell size={20} className={unreadCount > 0 ? 'text-blue-600' : 'text-gray-600'} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <NotificationPanel
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onRefresh={fetchNotifications}
            />
          </div>
        )}

        <User size={20} />
        <span className="text-sm">{userName?.trim().split(/\s+/)[0] ?? ''}</span>
        <span className="text-gray-400">|</span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 font-medium"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  );
}
