import React, { useEffect, useState } from 'react';
import { Bell, X, Calendar, Check } from 'lucide-react';

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

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onRefresh: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  if (!isOpen) return null;

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `há ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;

    return created.toLocaleDateString('pt-BR');
  };

  const getNotificationColor = (tipo: string) => {
    switch (tipo) {
      case 'urgent':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'info':
        return 'bg-yellow-50 border-yellow-200';
      case 'info14':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getIconColor = (tipo: string) => {
    switch (tipo) {
      case 'urgent':
        return 'text-red-600';
      case 'warning':
        return 'text-orange-500';
      case 'info':
        return 'text-yellow-600';
      case 'info14':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getDiasBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'urgent':  return 'bg-red-100 text-red-700';
      case 'warning': return 'bg-orange-100 text-orange-700';
      case 'info':    return 'bg-yellow-100 text-yellow-700';
      case 'info14':  return 'bg-blue-100 text-blue-700';
      default:        return 'bg-gray-100 text-gray-600';
    }
  };

  const unreadCount = notifications.filter(n => !n.lida).length;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-20 z-40"
        onClick={onClose}
      />

      <div className="fixed top-16 right-4 w-96 bg-white rounded-lg shadow-2xl z-50 border border-gray-200 max-h-[500px] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Notificações</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Marcar todas como lidas
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 transition-all ${
                    !notification.lida
                      ? `${getNotificationColor(notification.tipo)} border-l-4`
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${getIconColor(notification.tipo)}`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-sm font-semibold ${!notification.lida ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.titulo}
                          </h4>
                          {!notification.lida && notification.dias_restantes !== null && (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${getDiasBadgeColor(notification.tipo)}`}>
                              {notification.dias_restantes === 0
                                ? 'Hoje'
                                : notification.dias_restantes === 1
                                ? 'Amanhã'
                                : `${notification.dias_restantes} dias`}
                            </span>
                          )}
                        </div>
                        {!notification.lida && (
                          <button
                            onClick={() => onMarkAsRead(notification.id)}
                            className="text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0"
                            title="Marcar como lida"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.mensagem}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {getTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
