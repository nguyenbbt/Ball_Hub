import { CalendarDays, ClipboardList, Megaphone, Star, Clock, CheckCircle2, Circle, Zap, Trophy } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuthStore } from '@/store/useAuthStore';

const PRIORITY_COLORS: Record<string, { text: string; bg: string }> = {
  high: { text: '#dc2626', bg: '#fef2f2' },
  medium: { text: '#ea580c', bg: '#fff7ed' },
  low: { text: '#16a34a', bg: '#f0fdf4' },
};

export function PlayerDashboard({ apiData }: { apiData: any }) {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(' ')[0] || user?.firstName || 'Player';
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const profile = apiData?.profile || {};
  const tasks = apiData?.tasks || [];
  const schedule = apiData?.schedule || [];
  const announcements = apiData?.announcements || [];

  // Lấy các chỉ số cơ bản
  const pts = profile.pointsPerGame || 0;
  const reb = profile.reboundsPerGame || 0;
  const ast = profile.assistsPerGame || 0;

  // TỰ ĐỘNG TÍNH RATING NẾU DATABASE ĐANG LÀ 0
  let currentRating = profile.rating || 0;
  if (currentRating === 0 && (pts > 0 || reb > 0 || ast > 0)) {
    currentRating = Math.min(10, (pts + reb * 1.2 + ast * 1.5) / 2.5);
  }

  const myStats = [
    { label: 'PPG', value: pts.toFixed(1), color: '#1d4ed8' },
    { label: 'APG', value: ast.toFixed(1), color: '#ea580c' },
    { label: 'RPG', value: reb.toFixed(1), color: '#7c3aed' },
    { label: 'Rating', value: currentRating.toFixed(1), color: '#16a34a' },
  ];

  const radarData = [
    { stat: 'PTS', value: pts },
    { stat: 'REB', value: reb },
    { stat: 'AST', value: ast },
    { stat: 'STL', value: profile.stealsPerGame || 0 },
    { stat: 'BLK', value: profile.blocksPerGame || 0 },
    { stat: 'GP', value: profile.matchesPlayed || 0 },
  ];

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-slate-900 font-bold text-2xl">Hey, {firstName}! 🔥</h1>
          <p className="text-slate-500 mt-1" style={{ fontSize: '0.875rem' }}>{todayDate} · Theo dõi lịch trình và nhiệm vụ hôm nay nhé.</p>
        </div>
      </div>

      {/* My Stats */}
      <div className="grid grid-cols-4 gap-4">
        {myStats.map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow">
            <p style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p className="text-slate-500 mt-2 font-medium uppercase tracking-wider" style={{ fontSize: '0.75rem' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-purple-600" />
              <h2 className="text-slate-800 font-bold" style={{ fontSize: '0.9375rem' }}>My Tasks</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700" style={{ fontSize: '0.6875rem', fontWeight: 600 }}>
              {tasks.filter((t: any) => t.status !== 'DONE').length} pending
            </span>
          </div>
          <div className="space-y-2.5 flex-1 overflow-y-auto">
            {tasks.length === 0 ? (
               <p className="text-slate-400 text-sm text-center mt-10">Không có nhiệm vụ nào.</p>
            ) : (
              tasks.map((task: any) => {
                const isDone = task.status === 'DONE';
                const priority = task.priority?.toLowerCase() || 'medium';
                return (
                  <div key={task.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    {isDone ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" /> : <Circle size={18} className="text-slate-300 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 font-medium truncate" style={{ fontSize: '0.8125rem', textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#94a3b8' : undefined }}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Clock size={12} className="text-slate-400" />
                        <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : 'Không thời hạn'}
                        </span>
                        {!isDone && PRIORITY_COLORS[priority] && (
                          <span className="px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ background: PRIORITY_COLORS[priority].bg, color: PRIORITY_COLORS[priority].text, fontSize: '0.6rem', fontWeight: 700 }}>
                            {priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-blue-600" />
              <h2 className="text-slate-800 font-bold" style={{ fontSize: '0.9375rem' }}>Schedule</h2>
            </div>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {schedule.length === 0 ? (
               <p className="text-slate-400 text-sm text-center mt-10">Không có lịch trình sắp tới.</p>
            ) : (
              schedule.map((e: any) => {
                const type = e.type.toLowerCase();
                return (
                  <div key={e.id} className={`p-3.5 rounded-xl border ${type === 'match' ? 'border-orange-200 bg-orange-50/50' : 'border-blue-100 bg-blue-50/50'}`}>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 pr-2">
                        <p className={`truncate ${type === 'match' ? 'text-orange-900' : 'text-blue-900'}`} style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          {e.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Clock size={12} className={type === 'match' ? 'text-orange-400' : 'text-blue-400'} />
                          <span className="truncate" style={{ fontSize: '0.75rem', color: type === 'match' ? '#ea580c' : '#3b82f6', fontWeight: 500 }}>
                            {new Date(e.date).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} · {e.location || 'Team Facility'}
                          </span>
                        </div>
                      </div>
                      {type === 'match' ? <Trophy size={16} className="text-orange-500 shrink-0" /> : <Zap size={16} className="text-blue-500 shrink-0" />}
                    </div>
                    <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: 6, fontWeight: 500 }}>
                      {new Date(e.date).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Performance Radar */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-amber-500 fill-amber-500" />
              <h2 className="text-slate-800 font-bold" style={{ fontSize: '0.9375rem' }}>My Performance</h2>
            </div>
            <span className="text-slate-500 font-medium" style={{ fontSize: '0.75rem' }}>Season Avg</span>
          </div>
          <p className="text-slate-500 mb-4" style={{ fontSize: '0.8125rem' }}>Overall rating: <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{currentRating.toFixed(1)}</span></p>
          <div className="flex-1 min-h-[200px]">
            {profile.matchesPlayed > 0 || pts > 0 || reb > 0 || ast > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="stat" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} />
                  <Radar dataKey="value" name="Stats" stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-slate-400 text-sm">Chưa có dữ liệu thi đấu</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Announcements */}
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
  );
}