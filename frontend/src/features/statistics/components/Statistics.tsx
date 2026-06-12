import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from 'recharts';
import { TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { axiosClient } from '@/api/axiosClient';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-slate-900 rounded-xl p-3 shadow-xl border border-slate-700" style={{ fontSize: '0.75rem' }}>
      <p className="text-slate-300 mb-1 font-bold">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span style={{ fontWeight: 600 }}>{p.value}</span></p>
      ))}
    </div>
  );
};

export function Statistics({ role: _role }: { role?: string }) {
  const queryClient = useQueryClient();

  type Summary = {
    totalGames: number;
    ppg: number;
    oppPpg: number;
    rpg: number;
    winRate: number;
  };

  type StatsResponse = {
    summary: Summary;
    matchPerformance: Array<{ match: string; pts: number; oppPts: number; rebounds: number; assists: number }>;
    monthlyTrend: Array<{ month: string; wins: number; losses: number }>;
    playerRatings: Array<{ name: string; initials: string; rating: number; color: string }>;
    radarData: Array<{ stat: string; value: number }>;
  };

  const { data, isLoading, isError, isFetching } = useQuery<StatsResponse>({
    queryKey: ['statistics', 'dashboard'],
    queryFn: async () => {
      const response = await axiosClient.get('/statistics/dashboard');
      return response.data as StatsResponse;
    },
    staleTime: 10 * 60 * 1000, 
  });

  const handleRefresh = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['statistics', 'dashboard'] });
      toast.success('Latest statistical data updated!');
    } catch (error) {
      toast.error('Error refreshing data.');
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* HEADER ALONE TO PRESERVE LAYOUT (ANTI-FLICKER) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Statistics</h1>
          <p className="text-slate-500 mt-0.5" style={{ fontSize: '0.875rem' }}>
            Current Season {data ? `· ${data.summary.totalGames} games played` : ''}
          </p>
        </div>
        <button 
          onClick={handleRefresh} 
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          style={{ fontSize: '0.875rem', fontWeight: 500 }}
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin text-blue-500' : 'text-slate-400'} />
          {isFetching ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* ONLY CONTENT AREA SHOWS LOADER/ERROR */}
      {isLoading ? (
        <div className="flex justify-center items-center h-96 bg-white rounded-xl border border-slate-100 shadow-sm">
          <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-500">
          <span className="material-symbols-outlined text-6xl mb-4 opacity-50">warning</span>
          <p className="font-semibold text-lg">Unable to load statistics</p>
          <p className="text-sm mb-4">Please try again later.</p>
        </div>
      ) : (!data || data.summary.totalGames === 0) ? (
        <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-500">
          <span className="material-symbols-outlined text-6xl mb-4 opacity-50">query_stats</span>
          <p className="font-semibold text-lg">No statistical data available</p>
          <p className="text-sm">Please complete at least 1 match to view the charts.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Points Per Game (PPG)', value: data.summary.ppg, color: '#16a34a' },
              { label: 'Opponent PPG (OPPG)', value: data.summary.oppPpg, color: '#dc2626' }, 
              { label: 'Rebounds Per Game (RPG)', value: data.summary.rpg, color: '#1d4ed8' },
              { label: 'Win Rate (%)', value: data.summary.winRate, color: '#f59e0b' }
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-500 font-medium" style={{ fontSize: '0.8125rem' }}>{s.label}</p>
                  <TrendingUp size={16} className="text-emerald-500" />
                </div>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <p className="text-slate-800 mb-4 font-bold text-sm">Points Per Game (PTS)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.matchPerformance} barSize={12} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="match" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
                  <Bar dataKey="pts" name="Points Scored" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="oppPts" name="Opponent Points" fill="#fca5a5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <p className="text-slate-800 mb-4 font-bold text-sm">Rebounds & Assists Chart</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.matchPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="match" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="rebounds" name="Rebounds (REB)" stroke="#ea580c" strokeWidth={2.5} dot={{ fill: '#ea580c', r: 3, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="assists" name="Assists (AST)" stroke="#16a34a" strokeWidth={2.5} dot={{ fill: '#16a34a', r: 3, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <p className="text-slate-800 mb-4 font-bold text-sm">Playstyle Analysis (Team Strengths)</p>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={data.radarData} outerRadius="70%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis 
                    dataKey="stat" 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
                  />
                  <Radar dataKey="value" name="Team Rating" stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <p className="text-slate-800 mb-4 font-bold text-sm">Monthly Results (Win/Loss)</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.monthlyTrend} barSize={24} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
                  <Bar dataKey="wins" name="Wins (W)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="losses" name="Losses (L)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-800 mb-5 font-bold text-sm">Player Performance (Top 5 Ratings)</p>
            <div className="space-y-4">
              {data.playerRatings.length === 0 && <p className="text-slate-500 text-sm">No players have played yet</p>}
              {data.playerRatings.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-4 hover:bg-slate-50 p-2 rounded-lg transition-colors -mx-2">
                  <div className="flex items-center gap-3 w-40 shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm" style={{ background: p.color, fontSize: '0.6875rem', fontWeight: 700 }}>
                      {p.initials}
                    </div>
                    <span className="text-slate-700 font-medium truncate" style={{ fontSize: '0.8125rem' }}>{p.name}</span>
                  </div>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${(p.rating / 10) * 100}%`, background: `linear-gradient(90deg, ${p.color}, ${p.color}dd)` }}
                    />
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a', width: 36, textAlign: 'right' }}>{p.rating}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}