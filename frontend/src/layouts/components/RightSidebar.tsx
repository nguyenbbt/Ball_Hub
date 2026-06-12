import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Send, ChevronLeft } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { messagesApi, MessageRecord } from '@/features/messaging/api';
import { getSocket } from '@/features/messaging/socket';
import { useTeamStore } from '@/store/useTeamStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';

type ChatView = 'list' | 'team' | string;

const formatTimeShort = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  
  if (diffInMinutes < 1) return 'Vừa xong';
  if (diffInMinutes < 60) return `${diffInMinutes}p trước`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h trước`;
  return new Intl.DateTimeFormat('vi-VN', { month: 'short', day: 'numeric' }).format(date);
};

export function RightSidebar({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { team, coach, players } = useTeamStore();
  const user = useAuthStore((state) => state.user);
  const { activeChatUserId, setActiveChatUserId } = useUIStore();
  
  const [view, setView] = useState<ChatView>('list');
  const [text, setText] = useState('');
  
  const parentRef = useRef<HTMLDivElement>(null);
  const teamId = team?.id ?? team?._id ?? team?.teamId;

  useEffect(() => {
    if (activeChatUserId) {
      setView(activeChatUserId);
    } else {
      setView('list');
    }
  }, [activeChatUserId]);

  const roster = useMemo(() => {
    const list = [] as Array<{ id: string; name: string; avatarUrl?: string; initials: string; color: string }>;
    const addMember = (m: any) => {
      if (!m || m.id === user?.id) return;
      const initials = (m.firstName?.[0] || m.name?.charAt(0) || 'U').toUpperCase();
      const colors = ['#0891b2', '#7c3aed', '#dc2626', '#16a34a', '#ea580c', '#1d4ed8'];
      const color = colors[m.id.charCodeAt(0) % colors.length];
      list.push({ id: m.id, name: m.name || `${m.firstName} ${m.lastName}`, avatarUrl: m.avatarUrl, initials, color });
    };
    addMember(coach);
    players?.forEach(addMember);
    return list;
  }, [coach, players, user?.id]);

  // --- REACT QUERY: Lấy danh sách luồng tin nhắn ---
  const { data: threads = [] } = useQuery({
    queryKey: ['chat-threads'],
    queryFn: async () => {
      const res = await messagesApi.getDirectThreads();
      return res.threads;
    },
    enabled: !!user,
  });

  const threadByUserId = useMemo(() => new Map(threads.map((t) => [t.user.id, t])), [threads]);

  // --- REACT QUERY: Lấy tin nhắn chi tiết ---
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat-messages', view],
    queryFn: async () => {
      if (view === 'list') return [];
      const response = view === 'team' 
        ? await messagesApi.getTeamMessages(teamId, { limit: 100 }) 
        : await messagesApi.getDirectMessages(view, { limit: 100 });
      return response.messages.reverse();
    },
    enabled: view !== 'list' && !!teamId,
  });

  // --- ẢO HÓA DOM: Quản lý hàng ngàn tin nhắn ---
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65, 
    overscan: 10, 
  });

  // Tự động cuộn xuống cuối khi có tin nhắn mới hoặc đổi view
  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
  }, [messages.length, view, virtualizer]);

  // --- SOCKET: Lắng nghe tin nhắn mới và cập nhật Cache trực tiếp ---
  useEffect(() => {
    if (!teamId || !user) return;
    const socket = getSocket();
    if (!socket) return;
    
    socket.emit('presence:join', { teamId });

    const handleNewMessage = (msg: MessageRecord) => {
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });

      if (view === 'team' && msg.teamId === teamId) {
        queryClient.setQueryData(['chat-messages', view], (old: any) => [...(old || []), msg]);
      } else if (typeof view === 'string' && view !== 'list' && view !== 'team') {
        const isRelated = (msg.sender.id === view && msg.receiverId === user.id) || (msg.sender.id === user.id && msg.receiverId === view);
        if (isRelated) {
          queryClient.setQueryData(['chat-messages', view], (old: any) => [...(old || []), msg]);
        }
      }
    };

    socket.on('message:new', handleNewMessage);
    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [teamId, view, user, queryClient]);

  const handleSend = () => {
    if (!text.trim() || view === 'list') return;
    const socket = getSocket();
    if (!socket) return;
    
    const payload = view === 'team' ? { teamId, text } : { receiverId: view, text };

    socket.emit('message:send', payload, (res: any) => {
      if (res.ok) {
        setText('');
        queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      }
    });
  };

  const currentChatName = view === 'team' ? 'Team Chat' : roster.find(r => r.id === view)?.name;

  return (
    <aside className="fixed inset-y-0 right-0 z-[9999] flex flex-col bg-white border-l border-slate-200 shadow-2xl h-full transition-all duration-300 w-[320px]">
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100 shrink-0 bg-white">
        {view === 'list' ? (
          <h2 className="text-slate-800 font-bold text-sm tracking-wide">MESSAGES</h2>
        ) : (
          <div className="flex items-center gap-2 overflow-hidden">
            <button 
              onClick={() => {
                setView('list');
                setActiveChatUserId(null); 
              }} 
              className="text-slate-400 hover:text-blue-600 transition-colors shrink-0"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-slate-800 font-bold text-sm truncate">{currentChatName}</h2>
          </div>
        )}
        <button onClick={() => { setActiveChatUserId(null); onClose(); }} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        {view === 'list' ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="mb-3 px-2 flex items-center justify-between mt-2">
              <span className="text-[11px] font-bold text-slate-400 tracking-widest">GẦN ĐÂY</span>
              <button onClick={() => setView('team')} className="text-[12px] font-semibold text-blue-600 hover:text-blue-700">Team chat</button>
            </div>

            {roster.map((member) => {
              const thread = threadByUserId.get(member.id);
              const lastMessage = thread?.lastMessage?.text ?? 'Bắt đầu cuộc trò chuyện...';
              const unreadCount = thread?.unreadCount ?? 0;
              const hasUnread = unreadCount > 0;

              return (
                <button
                  key={member.id}
                  onClick={() => setView(member.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm" style={{ background: member.color, fontSize: '0.8rem', fontWeight: 700 }}>
                      {member.avatarUrl ? <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover rounded-full" /> : member.initials}
                    </div>
                    {hasUnread && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`truncate text-[13px] ${hasUnread ? 'text-slate-900 font-bold' : 'text-slate-700 font-semibold'}`}>{member.name}</span>
                      {thread?.lastMessage && <span className="text-[10px] text-slate-400 shrink-0 font-medium">{formatTimeShort(thread.lastMessage.createdAt)}</span>}
                    </div>
                    <p className={`truncate text-[12px] ${hasUnread ? 'text-blue-600 font-semibold' : 'text-slate-500 font-medium'}`}>{lastMessage}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div ref={parentRef} className="flex-1 overflow-y-auto p-4 bg-slate-50/50 relative">
              {isLoading && <p className="text-center text-xs text-slate-400 mt-4">Đang tải...</p>}
              
              {/* VÙNG ẢO HÓA DOM */}
              <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const msg = messages[virtualItem.index];
                  const isMine = msg.sender.id === user?.id;
                  const senderInfo = roster.find(r => r.id === msg.sender.id);

                  return (
                    <div
                      key={virtualItem.key}
                      data-index={virtualItem.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualItem.start}px)`,
                        paddingBottom: '16px'
                      }}
                    >
                      <div className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                        {!isMine && view === 'team' && (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 mt-1 shadow-sm" style={{ background: senderInfo?.color || '#94a3b8', fontSize: '0.6rem', fontWeight: 700 }}>
                            {senderInfo?.initials || msg.sender.name.charAt(0)}
                          </div>
                        )}
                        <div className={`max-w-[75%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                          {!isMine && view === 'team' && <span className="text-[10px] font-bold text-slate-400 ml-1">{msg.sender.name}</span>}
                          <div className={`px-3.5 py-2.5 rounded-2xl shadow-sm leading-relaxed ${isMine ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'}`} style={{ fontSize: '0.8125rem' }}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <input
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 bg-transparent outline-none text-slate-700 placeholder-slate-400 px-2"
                  style={{ fontSize: '0.8125rem' }}
                />
                <button onClick={handleSend} disabled={!text.trim()} className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0">
                  <Send size={14} className="ml-0.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}