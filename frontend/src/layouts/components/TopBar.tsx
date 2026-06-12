import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, MessageSquare, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { notificationsApi } from '@/features/notifications/api';
import { getSocket } from '@/features/messaging/socket';

interface TopBarProps {
  onToggleMessage?: () => void;
}

export function TopBar({ onToggleMessage }: TopBarProps) {
  const { user } = useAuthStore();
  const location = useLocation();
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const teamId = user?.teamId;
  const userId = user?.id;

  // Xử lý Click Outside để đóng Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch API & Lắng nghe Socket
  useEffect(() => {
    if (!teamId || !userId) return;

    const fetchNotifs = async () => {
      try {
        const data = await notificationsApi.getTeamNotifications(teamId);
        setNotifications(data);
      } catch (err) { console.error(err); }
    };
    fetchNotifs();

    const socket = getSocket();
    
    // ĐĂNG KÝ VÀO PHÒNG (RẤT QUAN TRỌNG ĐỂ NHẬN REALTIME)
    socket.emit('presence:join', { teamId });

    const handleNewNotif = (notif: any) => {
      if (notif.teamId === teamId) {
        setNotifications(prev => [notif, ...prev]);
      }
    };

    socket.on('notification:new', handleNewNotif);
    return () => { socket.off('notification:new', handleNewNotif); };
  }, [teamId, userId]);

  const unreadCount = notifications.filter(n => !n.readBy.includes(userId)).length;

  const handleMarkAsRead = async (id: string) => {
    if (!userId) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readBy: [...n.readBy, userId] } : n));
    try { await notificationsApi.markAsRead(id); } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    if (!teamId || !userId) return;
    setNotifications(prev => prev.map(n => ({ ...n, readBy: [...n.readBy, userId] })));
    try { await notificationsApi.markAllAsRead(teamId); } catch (e) {}
  };

  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentPage = pathParts[pathParts.length - 1] || 'Dashboard';
  const pageTitle = currentPage.charAt(0).toUpperCase() + currentPage.slice(1).replace('-', ' ');

  const getInitials = () => {
    if (!user?.firstName) return ':3';
    return (user.firstName[0] + (user.lastName ? user.lastName[0] : '')).toUpperCase();
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN');
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
      <div className="flex items-center gap-2.5">
        <span className="text-slate-400 text-sm font-medium tracking-wide">BallHub</span>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="text-slate-800 text-sm font-semibold tracking-wide capitalize">{pageTitle}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* BELL NOTIFICATION */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotif(!showNotif)}
            className={`p-2 rounded-full transition-colors relative ${showNotif ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
          >
            <Bell size={18} strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>

          {/* DROPDOWN MENU */}
          {showNotif && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-sm">Thông báo ({unreadCount})</h3>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Đọc tất cả
                  </button>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
                {notifications.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs py-6 font-medium">Chưa có thông báo nào</p>
                ) : (
                  notifications.map((n) => {
                    const isRead = n.readBy.includes(userId);
                    return (
                      <div 
                        key={n.id} 
                        onClick={() => handleMarkAsRead(n.id)}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${isRead ? 'opacity-70 hover:bg-slate-50' : 'bg-blue-50/50 border border-blue-100 hover:bg-blue-50'}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className={`text-sm ${isRead ? 'text-slate-700 font-medium' : 'text-blue-900 font-bold'}`}>{n.title}</p>
                          {!isRead && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">{formatTime(n.createdAt)}</p>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <button onClick={onToggleMessage} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <MessageSquare size={18} strokeWidth={2} />
        </button>

        <div className="ml-2 pl-4 border-l border-slate-200 flex items-center">
          <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800/50 flex items-center justify-center text-white text-xs font-bold shadow-sm cursor-pointer hover:ring-2 hover:ring-slate-300 transition-all">
            {getInitials()}
          </div>
        </div>
      </div>
    </header>
  );
}