import { Users, Trophy, TrendingUp, Clock, ArrowUp, ArrowDown, Minus, ChevronRight, Zap, Target, AlertCircle, Megaphone } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useAuthStore } from '@/store/useAuthStore'

const STATUS_COLORS: Record<string, { text: string; bg: string; label: string }> = {
  available: { text: '#16a34a', bg: '#f0fdf4', label: 'Available' },
  injured: { text: '#dc2626', bg: '#fef2f2', label: 'Injured' },
  uncertain: { text: '#ea580c', bg: '#fff7ed', label: 'Uncertain' },
}

const COLORS_PALETTE = ['#1d4ed8', '#0891b2', '#dc2626', '#16a34a', '#7c3aed', '#ea580c'];

export function CoachDashboard({ apiData }: { apiData: any }) {
  const { user } = useAuthStore();
  const coachName = user?.lastName || user?.name || 'Coach';
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const stats = apiData?.stats || { rosterCount: 0, upcomingGames: 0, pendingTasks: 0, winRate: 'N/A', winLoss: 'Updating...' };
  const events = apiData?.todayEvents || [];
  const roster = apiData?.roster || [];
  const performanceData = apiData?.performanceData || [];
  const latestRating = performanceData.length > 0 ? performanceData[performanceData.length - 1].rating.toFixed(1) : 'N/A';
  const announcements = apiData?.announcements || [];

  const displayStats = [
    { label: 'Roster Size', value: stats.rosterCount, sub: 'Active players', icon: <Users size={20} />, color: '#1d4ed8', bg: '#eff6ff', trend: 'neutral', trendVal: 'Current squad' },
    { label: 'Upcoming Games', value: stats.upcomingGames, sub: 'Next: Tonight', icon: <Trophy size={20} />, color: '#ea580c', bg: '#fff7ed', trend: 'neutral', trendVal: 'Scheduled' },
    { label: 'Pending Tasks', value: stats.pendingTasks, sub: 'Active', icon: <Target size={20} />, color: '#7c3aed', bg: '#faf5ff', trend: 'neutral', trendVal: 'Needs attention' },
    { label: 'Win Rate', value: stats.winRate, sub: stats.winLoss, icon: <TrendingUp size={20} />, color: '#16a34a', bg: '#f0fdf4', trend: stats.winRate === 'N/A' ? 'neutral' : 'up', trendVal: 'All matches' },
  ];

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in duration-500">
      {/* Greeting */}
      <div>
        <h1 className="text-slate-900 font-bold text-2xl">Good morning, Coach {coachName}!</h1>
        <p className="text-slate-500 mt-1" style={{ fontSize: '0.875rem' }}>{todayDate} · Stay updated with your team</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {displayStats.map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
              <div className="flex items-center gap-1" style={{ fontSize: '0.6875rem', color: s.trend === 'up' ? '#16a34a' : '#94a3b8' }}>
                {s.trend === 'up' ? <ArrowUp size={12} /> : <Minus size={12} />}
              </div>
            </div>
            <div className="mt-3">
              <p className="text-slate-900" style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{s.value}</p>
              <p className="text-slate-500 mt-1" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{s.label}</p>
            </div>
            <p className="mt-2" style={{ fontSize: '0.75rem', color: s.color, fontWeight: 500 }}>{s.trendVal}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Today's Events */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-800 font-bold" style={{ fontSize: '0.9375rem' }}>Today's Schedule</h2>
            <button className="flex items-center gap-1 text-blue-600 font-medium hover:text-blue-700 transition-colors" style={{ fontSize: '0.75rem' }}>
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-slate-400 text-sm text-center mt-10">Không có sự kiện nào hôm nay.</p>
            ) : (
              events.map((e: any, i: number) => {
                const type = e.type.toLowerCase();
                return (
                  <div key={e.id} className="flex gap-3 items-start">
                    <div className="flex flex-col items-center gap-1 shrink-0" style={{ width: 40 }}>
                      <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 600 }}>
                        {new Date(e.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {i < events.length - 1 && <div className="w-px flex-1 bg-slate-100" style={{ minHeight: 16 }} />}
                    </div>
                    <div className={`flex-1 p-3 rounded-lg border ${type === 'match' ? 'border-orange-200 bg-orange-50/50' : type === 'training' ? 'border-blue-100 bg-blue-50/50' : 'border-purple-100 bg-purple-50/50'}`}>
                      <div className="flex items-center gap-2">
                        <span className={type === 'match' ? 'text-orange-600' : type === 'training' ? 'text-blue-600' : 'text-purple-600'}>
                          {type === 'match' ? <Trophy size={14} /> : (type === 'training' ? <Zap size={14} /> : <Target size={14} />)}
                        </span>
                        <span className="text-slate-800" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{e.title}</span>
                      </div>
                      <p className="text-slate-500 mt-1 truncate" style={{ fontSize: '0.75rem' }}>{e.location || 'Team Facility'}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-800 font-bold" style={{ fontSize: '0.9375rem' }}>Team Performance</h2>
          </div>
          
          {performanceData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <TrendingUp size={32} className="text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm font-medium">Chưa đủ dữ liệu biểu đồ</p>
              <p className="text-slate-400 text-xs mt-1">Hoàn thành thêm các trận đấu để xem xu hướng.</p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-4 mb-3">
                <p style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{latestRating}</p>
                <div>
                  <p style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>Chỉ số phong độ (dựa trên hiệu số)</p>
                </div>
              </div>
              <div className="flex-1 min-h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Line type="monotone" dataKey="rating" stroke="#1d4ed8" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        {/* Player Availability (Roster) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-800 font-bold" style={{ fontSize: '0.9375rem' }}>Availability</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                {roster.filter((r: any) => r.profile?.status === 'available').length} active
              </span>
            </div>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {roster.length === 0 ? (
              <p className="text-slate-400 text-sm text-center mt-10">Chưa có cầu thủ nào trong đội.</p>
            ) : (
              roster.map((p: any, i: number) => {
                const status = p.profile?.status || 'available';
                const s = STATUS_COLORS[status] || STATUS_COLORS['available'];
                const initials = `${p.firstName?.charAt(0) || ''}${p.lastName?.charAt(0) || ''}`.toUpperCase() || 'P';
                
                return (
                  <div key={p.id} className="flex items-center justify-between p-1 hover:bg-slate-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm" style={{ background: COLORS_PALETTE[i % COLORS_PALETTE.length], fontSize: '0.625rem', fontWeight: 700 }}>
                        {p.avatarUrl ? <img src={p.avatarUrl} alt={p.firstName} className="w-full h-full object-cover rounded-full" /> : initials}
                      </div>
                      <div>
                        <p className="text-slate-800 font-semibold truncate max-w-[100px]" style={{ fontSize: '0.8125rem' }}>
                          {p.firstName} {p.lastName?.charAt(0)}.
                        </p>
                        <p style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>{p.profile?.position || 'N/A'}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md" style={{ background: s.bg, color: s.text, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                      {s.label}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Announcements (Thông báo đội bóng) */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-slate-600" />
            <h2 className="text-slate-800 font-bold" style={{ fontSize: '0.9375rem' }}>Team Announcements</h2>
          </div>
        </div>
        <div className="space-y-3">
          {(!announcements || announcements.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
              <Megaphone size={24} className="mb-2 opacity-50" />
              <p className="text-sm font-medium">Chưa có thông báo nào</p>
            </div>
          ) : (
            announcements.map((a: any) => {
              const isUrgent = a.type === 'MATCH' || a.type === 'URGENT';
              return (
                <div key={a.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${isUrgent ? 'border-orange-200 bg-orange-50/50 hover:bg-orange-50' : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-slate-800" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{a.title}</p>
                      {isUrgent && <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white" style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.05em' }}>URGENT</span>}
                    </div>
                    <p className="text-slate-600 mt-1.5 leading-relaxed" style={{ fontSize: '0.8125rem' }}>{a.message}</p>
                    <p className="mt-2.5 font-medium text-slate-400" style={{ fontSize: '0.6875rem' }}>
                      {new Date(a.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} · {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}