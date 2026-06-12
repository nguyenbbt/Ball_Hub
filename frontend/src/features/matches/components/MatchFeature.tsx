import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Trophy, MapPin, Clock, ChevronRight, Shield, X, Activity, Loader2 } from "lucide-react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/api/axiosClient";
import { useTeamStore } from "@/store/useTeamStore";
import { useAuthStore } from "@/store/useAuthStore";

type Match = {
  id: string; 
  opponent: string;
  date: string;
  time: string;
  venue: string;
  type: "league" | "cup" | "friendly";
  status: "upcoming" | "completed" | "live";
  home: boolean;
  result?: { us: number; them: number };
  scorers?: string[];
  fieldGoalPct?: number;
  rebounds?: number;
  assists?: number;
  steals?: number;
  turnovers?: number;
  rawDate: Date;
};

const TYPE_COLORS: Record<string, { text: string; bg: string }> = {
  league: { text: "#1d4ed8", bg: "#eff6ff" },
  cup: { text: "#7c3aed", bg: "#faf5ff" },
  friendly: { text: "#0891b2", bg: "#ecfeff" },
};

const PAGE_SIZE = 10;

// ĐÃ FIX: Đổi tên hàm thành Matches để khớp với import trong MatchPage.tsx
export function Matches({ role: _role }: { role: string }) {
  const queryClient = useQueryClient();
  const team = useTeamStore((state) => state.team);
  const { user } = useAuthStore();

  const [selected, setSelected] = useState<Match | null>(null);
  const [tab, setTab] = useState<"upcoming" | "results">("upcoming");
  
  const [trackingMatch, setTrackingMatch] = useState<Match | null>(null);
  const [liveStats, setLiveStats] = useState<Record<string, { pts: number, reb: number, ast: number }>>({});
  const [oppPts, setOppPts] = useState<number>(0);

  const { data: rosterData = [] } = useQuery({
    queryKey: ['roster', user?.teamId],
    queryFn: async () => {
      const res = await axiosClient.get('/teams/roster');
      return res.data;
    },
    select: (cacheData: any) => {
      if (Array.isArray(cacheData)) return cacheData;
      return cacheData?.players || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.teamId
  });

  const {
    data: matchesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isMatchesLoading
  } = useInfiniteQuery({
    queryKey: ['matches', user?.teamId],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axiosClient.get(`/matches?page=${pageParam}&limit=${PAGE_SIZE}`);
      return res.data; 
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage?.meta && lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    enabled: !!user?.teamId
  });

  const matches = useMemo(() => {
    if (!matchesData) return [];
    
    return matchesData.pages.flatMap((page: any) => page.data || []).map((m: any): Match => {
      const matchDate = new Date(m.date);
      const details = m.matchDetails || {};

      const hasStats = details.teamPoints != null && details.teamPoints !== undefined;
      
      const isCompleted = hasStats;

      return {
        id: m.id,
        opponent: details.opponent || 'Unknown',
        date: matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        venue: m.location || 'Unknown',
        type: (details.matchType?.toLowerCase() || 'league') as any,
        status: isCompleted ? "completed" : "upcoming",
        home: details.isHome ?? true,
        result: hasStats ? { us: details.teamPoints, them: details.opponentPoints || 0 } : undefined,
        rebounds: details.rebounds || 0,
        assists: details.assists || 0,
        rawDate: matchDate
      };
    });
  }, [matchesData]);

  const upcoming = useMemo(() => matches.filter((m) => m.status === "upcoming").sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime()), [matches]);
  const results = useMemo(() => matches.filter((m) => m.status === "completed").sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime()), [matches]);
  const displayList = tab === "upcoming" ? upcoming : results;

  const stats = useMemo(() => {
    let w = 0, l = 0, pts = 0, oppPts = 0;
    results.forEach(m => {
      if (m.result) {
        if (m.result.us > m.result.them) w++;
        else l++;
        pts += m.result.us;
        oppPts += m.result.them;
      }
    });
    
    let streak = 0;
    for (const m of results) {
      if (m.result && m.result.us > m.result.them) streak++;
      else break;
    }

    const totalGames = results.length || 1;
    return {
      wins: w,
      losses: l,
      streak: streak > 0 ? `W${streak}` : '-',
      ppg: (pts / totalGames).toFixed(1),
      oppPpg: (oppPts / totalGames).toFixed(1),
    };
  }, [results]);

  const saveStatsMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: any }) => {
      return axiosClient.put(`/matches/${id}/stats`, payload);
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['matches', user?.teamId] });
      const previousMatches = queryClient.getQueryData(['matches', user?.teamId]);

      const teamPoints = Object.values(payload.stats as Record<string, {pts: number}>).reduce((sum, s) => sum + s.pts, 0);
      const opponentPoints = payload.opponentPoints || 0;

      queryClient.setQueryData(['matches', user?.teamId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((m: any) => {
              if (m.id === id) {
                return {
                  ...m,
                  matchDetails: {
                    ...m.matchDetails,
                    teamPoints: teamPoints,
                    opponentPoints: opponentPoints
                  }
                };
              }
              return m;
            })
          }))
        };
      });

      setTrackingMatch(null); 
      return { previousMatches };
    },
    onSuccess: () => {
      toast.success('Match results and stats saved!');
    },
    onError: (err, variables, context) => {
      if (context?.previousMatches) {
        queryClient.setQueryData(['matches', user?.teamId], context.previousMatches);
      }
      toast.error('Failed to save match results. Please try again!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['matches', user?.teamId] });
      queryClient.invalidateQueries({ queryKey: ['roster', user?.teamId] });
    }
  });

  const openTracker = (match: Match) => {
    setTrackingMatch(match);
    const initialStats: Record<string, { pts: number, reb: number, ast: number }> = {};
    rosterData.forEach((p: any) => {
      if (p.id) initialStats[p.id] = { pts: 0, reb: 0, ast: 0 };
    });
    setLiveStats(initialStats);
    setOppPts(0);
  };

  const updateStat = (userId: string, statType: 'pts' | 'reb' | 'ast', amount: number) => {
    setLiveStats(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [statType]: Math.max(0, (prev[userId]?.[statType] || 0) + amount)
      }
    }));
  };

  const saveStats = () => {
    if (!trackingMatch) return;
    saveStatsMutation.mutate({
      id: trackingMatch.id,
      payload: { stats: liveStats, opponentPoints: oppPts }
    });
  };

  const teamTotalPoints = Object.values(liveStats).reduce((sum, s) => sum + s.pts, 0);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Matches</h1>
          <p className="text-slate-500 mt-0.5" style={{ fontSize: '0.875rem' }}>Manage Match Schedules and Results</p>
        </div>
        <div className="flex items-center gap-3 text-center">
          {[
            { label: "W", value: stats.wins, color: "#16a34a" },
            { label: "L", value: stats.losses, color: "#dc2626" },
            { label: "STRK", value: stats.streak, color: "#f59e0b" },
          ].map((s) => (
            <div key={s.label} className="w-14 py-2 rounded-xl bg-white border border-slate-100 shadow-sm">
              <p style={{ fontWeight: 700, fontSize: "1.125rem", color: s.color }}>{s.value}</p>
              <p className="text-slate-400" style={{ fontSize: "0.6875rem" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-slate-100 w-fit">
            {(["upcoming", "results"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelected(null); }}
                className={`px-5 py-2 rounded-lg transition-all ${tab === t ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                style={{ fontSize: "0.875rem", fontWeight: 500 }}
              >
                {t === "upcoming" ? "Upcoming" : "Results"}
              </button>
            ))}
          </div>

          {isMatchesLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>
          ) : displayList.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">No matches found.</p>
          ) : (
            <>
              {displayList.map((match) => {
                const typeStyle = TYPE_COLORS[match.type] || TYPE_COLORS.league;
                const isWin = match.result && match.result.us > match.result.them;
                const isDraw = match.result && match.result.us === match.result.them;

                const isSelected = selected?.id === match.id;

                return (
                  <div
                    key={match.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(isSelected ? null : match)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelected(isSelected ? null : match);
                      }
                    }}
                    className={`w-full bg-white rounded-xl p-5 shadow-sm border text-left hover:shadow-md transition-all ${isSelected ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-100"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {match.result ? (
                          <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${isWin ? "bg-green-50" : isDraw ? "bg-amber-50" : "bg-red-50"}`}>
                            <span style={{ fontSize: "1.25rem", fontWeight: 700, color: isWin ? "#16a34a" : isDraw ? "#d97706" : "#dc2626", lineHeight: 1 }}>
                              {match.result.us}-{match.result.them}
                            </span>
                            <span style={{ fontSize: "0.625rem", fontWeight: 600, color: isWin ? "#16a34a" : isDraw ? "#d97706" : "#dc2626", marginTop: 2 }}>
                              {isWin ? "WIN" : isDraw ? "DRAW" : "LOSS"}
                            </span>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <Trophy size={24} className="text-blue-500" />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <Shield size={16} className="text-slate-400" />
                            <p className="text-slate-900" style={{ fontWeight: 600, fontSize: "1rem" }}>
                              {match.home ? (team?.name || 'Your Team') : match.opponent}
                              <span className="text-slate-400 mx-1" style={{ fontWeight: 400 }}>vs</span>
                              {match.home ? match.opponent : (team?.name || 'Your Team')}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="px-2 py-0.5 rounded-full capitalize" style={{ ...typeStyle, fontSize: "0.6875rem", fontWeight: 500 }}>{match.type}</span>
                            <div className="flex items-center gap-1 text-slate-400" style={{ fontSize: "0.75rem" }}>
                              <Clock size={12} /> {match.date} · {match.time}
                            </div>
                            <div className="flex items-center gap-1 text-slate-400" style={{ fontSize: "0.75rem" }}>
                              <MapPin size={12} /> {match.venue}
                            </div>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} className={`text-slate-300 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                    </div>

                    {isSelected && match.status === "upcoming" && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openTracker(match); }}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          style={{ fontSize: '0.875rem', fontWeight: 500 }}
                        >
                          <Activity size={16} /> Track Live Stats
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {hasNextPage && (
                <div className="flex justify-center pt-4 pb-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchNextPage();
                    }}
                    disabled={isFetchingNextPage}
                    className="px-6 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors flex items-center gap-2"
                  >
                    {isFetchingNextPage ? <Loader2 size={14} className="animate-spin" /> : 'Load More Matches'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="w-64 space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-800 mb-4" style={{ fontWeight: 500, fontSize: "0.9375rem" }}>Season Overview</p>
            <div className="space-y-3">
              {[
                { label: "Points Per Game", value: stats.ppg, color: "#16a34a" },
                { label: "Opponent PPG", value: stats.oppPpg, color: "#dc2626" },
                { label: "Win Streak", value: stats.streak.replace('W', ''), color: "#1d4ed8" },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-slate-500" style={{ fontSize: "0.8125rem" }}>{s.label}</span>
                  <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {trackingMatch && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-slate-900 font-bold text-lg">Live Stats: vs {trackingMatch.opponent}</h2>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm font-medium">Our Points:</span>
                    <span className="text-2xl font-black text-blue-600">{teamTotalPoints}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm font-medium">Opponent:</span>
                    <input 
                      type="number" 
                      value={oppPts} 
                      onChange={e => setOppPts(parseInt(e.target.value) || 0)}
                      className="w-16 text-2xl font-black text-red-600 bg-white border border-slate-200 rounded text-center outline-none focus:ring-2 focus:ring-red-200"
                    />
                  </div>
                </div>
              </div>
              <button onClick={() => setTrackingMatch(null)} className="p-2 rounded-lg hover:bg-slate-200">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid gap-3">
                {rosterData.map((player: any) => (
                  <div key={player.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between hover:border-blue-200 transition-colors shadow-sm">
                    <div className="w-1/4">
                      <p className="font-semibold text-slate-800 text-sm truncate">{player.name || player.firstName}</p>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                        <button onClick={(e) => { e.stopPropagation(); updateStat(player.id, 'pts', -1); }} className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 rounded shadow-sm hover:text-red-500 font-bold">-</button>
                        <div className="w-12 text-center">
                          <span className="block text-xs text-slate-400 font-medium">PTS</span>
                          <span className="block font-bold text-slate-800 leading-none">{liveStats[player.id]?.pts || 0}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); updateStat(player.id, 'pts', 1); }} className="w-8 h-8 bg-blue-100 text-blue-600 rounded shadow-sm hover:bg-blue-200 font-bold">+1</button>
                        <button onClick={(e) => { e.stopPropagation(); updateStat(player.id, 'pts', 2); }} className="w-8 h-8 bg-blue-100 text-blue-600 rounded shadow-sm hover:bg-blue-200 font-bold">+2</button>
                        <button onClick={(e) => { e.stopPropagation(); updateStat(player.id, 'pts', 3); }} className="w-8 h-8 bg-blue-100 text-blue-600 rounded shadow-sm hover:bg-blue-200 font-bold">+3</button>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                        <button onClick={(e) => { e.stopPropagation(); updateStat(player.id, 'ast', -1); }} className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 rounded shadow-sm hover:text-red-500 font-bold">-</button>
                        <div className="w-10 text-center">
                          <span className="block text-xs text-slate-400 font-medium">AST</span>
                          <span className="block font-bold text-slate-800 leading-none">{liveStats[player.id]?.ast || 0}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); updateStat(player.id, 'ast', 1); }} className="w-10 h-8 bg-emerald-100 text-emerald-600 rounded shadow-sm hover:bg-emerald-200 font-bold">+1</button>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                        <button onClick={(e) => { e.stopPropagation(); updateStat(player.id, 'reb', -1); }} className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 rounded shadow-sm hover:text-red-500 font-bold">-</button>
                        <div className="w-10 text-center">
                          <span className="block text-xs text-slate-400 font-medium">REB</span>
                          <span className="block font-bold text-slate-800 leading-none">{liveStats[player.id]?.reb || 0}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); updateStat(player.id, 'reb', 1); }} className="w-10 h-8 bg-purple-100 text-purple-600 rounded shadow-sm hover:bg-purple-200 font-bold">+1</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-2xl">
              <button 
                onClick={() => setTrackingMatch(null)} 
                disabled={saveStatsMutation.isPending}
                className="px-6 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); saveStats(); }} 
                disabled={saveStatsMutation.isPending}
                className="px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                {saveStatsMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                {saveStatsMutation.isPending ? 'Saving...' : 'Save & Finish Match'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}