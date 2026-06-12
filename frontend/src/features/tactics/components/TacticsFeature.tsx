import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { ChevronDown, Save, X, BookOpen, MousePointer2, ArrowUpRight, Activity, Eraser, CircleDot, Trash2, AlignLeft, AlertTriangle, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@/api/axiosClient'
import { useAuthStore } from '@/store/useAuthStore'

import { tacticApi } from '../api'
import { Tactic, Position, TacticNote } from '../types'

const PRESET_PLAYS: Record<string, { positions: { pos: string, x: number, y: number }[], notes: TacticNote[] }> = {
  'Motion Offense': {
    positions: [
      { pos: 'PG', x: 50, y: 20 },
      { pos: 'SG', x: 83, y: 35 },
      { pos: 'SF', x: 88, y: 68 },
      { pos: 'PF', x: 12, y: 68 },
      { pos: 'C',  x: 50, y: 74 },
    ],
    notes: [
      { label: 'Full Court Press', active: true },
      { label: 'Pick & Roll', active: false },
      { label: 'Zone Defense', active: false },
      { label: 'Transition Game', active: false },
    ]
  },
  'Pick & Roll': {
    positions: [
      { pos: 'PG', x: 42, y: 24 },
      { pos: 'SG', x: 82, y: 32 },
      { pos: 'SF', x: 12, y: 60 },
      { pos: 'PF', x: 82, y: 65 },
      { pos: 'C',  x: 58, y: 46 },
    ],
    notes: [
      { label: 'Full Court Press', active: false },
      { label: 'Pick & Roll', active: true },
      { label: 'Zone Defense', active: false },
      { label: 'Transition Game', active: false },
    ]
  },
  '2-3 Zone': {
    positions: [
      { pos: 'PG', x: 36, y: 16 },
      { pos: 'SG', x: 64, y: 16 },
      { pos: 'SF', x: 18, y: 52 },
      { pos: 'PF', x: 82, y: 52 },
      { pos: 'C',  x: 50, y: 70 },
    ],
    notes: [
      { label: 'Full Court Press', active: false },
      { label: 'Pick & Roll', active: false },
      { label: 'Zone Defense', active: true },
      { label: 'Transition Game', active: false },
    ]
  },
  'Fast Break': {
    positions: [
      { pos: 'PG', x: 50, y: 14 },
      { pos: 'SG', x: 22, y: 28 },
      { pos: 'SF', x: 78, y: 28 },
      { pos: 'PF', x: 18, y: 58 },
      { pos: 'C',  x: 50, y: 56 },
    ],
    notes: [
      { label: 'Full Court Press', active: false },
      { label: 'Pick & Roll', active: false },
      { label: 'Zone Defense', active: false },
      { label: 'Transition Game', active: true },
    ]
  }
}

const PLAYER_COLORS: Record<string, string> = {
  'PG': '#1d4ed8', 'SG': '#dc2626', 'SF': '#0891b2', 'PF': '#16a34a', 'C': '#ea580c'
}

type DrawMode = 'select' | 'run' | 'pass' | 'dribble';
type DrawPath = { mode: DrawMode, points: { x: number, y: number }[] };

const COACH_NOTE_KEY = '__COACH_TEXT_NOTE__';

export function TacticsBoard() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  
  const [activePlayName, setActivePlayName] = useState<string>('Motion Offense')
  const [activeTacticId, setActiveTacticId] = useState<string | null>(null)
  
  const [currentPlayers, setCurrentPlayers] = useState<Position[]>([])
  const [currentNotes, setCurrentNotes] = useState<TacticNote[]>([])
  const [coachNote, setCoachNote] = useState<string>('')
  
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)

  const [drawMode, setDrawMode] = useState<DrawMode>('select')
  const [paths, setPaths] = useState<DrawPath[]>([])
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[] | null>(null)
  const [draggingItem, setDraggingItem] = useState<string | 'ball' | null>(null)

  const [showBall, setShowBall] = useState(false)
  const [ballPos, setBallPos] = useState({ x: 50, y: 50 })

  const [showSaveModal, setShowSaveModal] = useState(false)
  const [newTacticName, setNewTacticName] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isFetchingDetail, setIsFetchingDetail] = useState(false)

  // ĐÃ FIX: Đồng bộ queryKey theo teamId và bóc tách dữ liệu mảng
  const { data: rosterData = [] } = useQuery({
    queryKey: ['roster', user?.teamId],
    queryFn: async () => {
      const res = await axiosClient.get('/teams/roster')
      return res.data
    },
    select: (cacheData: any) => {
      if (Array.isArray(cacheData)) return cacheData;
      return cacheData?.players || [];
    },
    staleTime: 5 * 60 * 1000,
  })

  // ĐÃ FIX: Đồng bộ queryKey cho bảng tactics
  const { data: tactics = [], isLoading: isLoadingTactics } = useQuery({
    queryKey: ['tactics', user?.teamId],
    queryFn: async () => {
      const res = await tacticApi.getTactics()
      const payload = res?.data?.data
      return Array.isArray(payload) ? payload : (payload as any)?.data || []
    }
  })

  const mapRosterToPositions = (presetPositions: { pos: string, x: number, y: number }[], players: any[]): Position[] => {
    return (presetPositions || []).map((dp: { pos: string, x: number, y: number }, i: number) => {
      const p = players[i]
      if (p) {
        const name = p?.name || `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim() || `Player ${i+1}`
        const initials = (p?.firstName?.[0] || name.charAt(0) || `${i+1}`).toUpperCase()
        return { ...dp, name, initials, color: PLAYER_COLORS[dp.pos] || '#64748b' }
      }
      return { ...dp, name: `Player ${i + 1}`, initials: `${i + 1}`, color: PLAYER_COLORS[dp.pos] || '#64748b' }
    })
  }

  const applyPresetPlay = (playName: string, players = rosterData) => {
    const preset = PRESET_PLAYS[playName]
    if (preset) {
      setActivePlayName(playName)
      setActiveTacticId(null)
      setCurrentPlayers(mapRosterToPositions(preset.positions, players || []))
      setCurrentNotes(preset.notes || [])
      setCoachNote('')
      setSelectedPlayer(null)
      setPaths([]) 
      setShowBall(false)
    }
  }

  useEffect(() => {
    if ((rosterData || []).length > 0 && !isInitialized) {
      applyPresetPlay('Motion Offense', rosterData)
      setIsInitialized(true)
    }
  }, [rosterData, isInitialized])

  const createMutation = useMutation({
    mutationFn: (payload: any) => tacticApi.createTactic(payload),
    onMutate: async (newTactic) => {
      await queryClient.cancelQueries({ queryKey: ['tactics', user?.teamId] })
      const previous = queryClient.getQueryData<Tactic[]>(['tactics', user?.teamId])
      
      const optimisticTactic: Tactic = { ...newTactic, id: `temp-${Date.now()}` }
      queryClient.setQueryData<Tactic[]>(['tactics', user?.teamId], (old) => [optimisticTactic, ...(old || [])])
      
      setActiveTacticId(optimisticTactic.id)
      setActivePlayName(optimisticTactic.name)
      setShowSaveModal(false) 
      
      return { previous, optimisticTactic }
    },
    onSuccess: (res: any, _vars, context) => {
      queryClient.setQueryData<Tactic[]>(['tactics', user?.teamId], (old) =>
        (old || []).map((t: Tactic) => t?.id === context?.optimisticTactic?.id ? { ...t, ...(res?.data?.data || {}) } : t)
      )
      if (res?.data?.data?.id) setActiveTacticId(res.data.data.id)
      toast.success('Lưu chiến thuật thành công!')
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['tactics', user?.teamId], context?.previous)
      toast.error('Đã xảy ra lỗi khi lưu chiến thuật mới.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tactics', user?.teamId] })
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: any }) => tacticApi.updateTactic(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['tactics', user?.teamId] })
      const previous = queryClient.getQueryData<Tactic[]>(['tactics', user?.teamId])
      
      queryClient.setQueryData<Tactic[]>(['tactics', user?.teamId], (old) =>
        (old || []).map((t: Tactic) => t?.id === id ? { ...t, ...payload } : t)
      )
      return { previous }
    },
    onSuccess: () => toast.success('Cập nhật chiến thuật thành công!'),
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['tactics', user?.teamId], context?.previous)
      toast.error('Đã xảy ra lỗi khi cập nhật.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tactics', user?.teamId] })
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tacticApi.deleteTactic(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tactics', user?.teamId] })
      const previous = queryClient.getQueryData<Tactic[]>(['tactics', user?.teamId])
      
      queryClient.setQueryData<Tactic[]>(['tactics', user?.teamId], (old) => (old || []).filter((t: Tactic) => t?.id !== id))
      
      if (activeTacticId === id) {
        applyPresetPlay('Motion Offense', rosterData)
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['tactics', user?.teamId], context?.previous)
      toast.error('Lỗi khi xóa chiến thuật.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tactics', user?.teamId] })
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  const handleSelectSavedTactic = async (tacticShallow: Tactic) => {
    if (!tacticShallow?.id) return;
    try {
      setIsFetchingDetail(true)
      const res = await tacticApi.getTacticById(tacticShallow.id)
      const tactic = res?.data?.data

      if (!tactic) {
        toast.error('Dữ liệu chiến thuật bị lỗi.')
        return
      }

      setActiveTacticId(tactic.id)
      setActivePlayName(tactic.name || 'Custom Tactic')
      
      const playersData = tactic.players || []
      const notesData = tactic.notes || []

      setCurrentPlayers(playersData)
      
      const extractedNotes = notesData.filter((n: TacticNote) => !n?.label?.startsWith(COACH_NOTE_KEY))
      setCurrentNotes(extractedNotes.length > 0 ? extractedNotes : (PRESET_PLAYS['Motion Offense']?.notes || []))

      const noteTextObj = notesData.find((n: TacticNote) => n?.label?.startsWith(COACH_NOTE_KEY))
      setCoachNote(noteTextObj ? noteTextObj.label.replace(COACH_NOTE_KEY, '') : '')

      setSelectedPlayer(null)
      setPaths([])
      setShowBall(false)
    } catch (error) {
      toast.error('Không thể tải chi tiết chiến thuật.')
    } finally {
      setIsFetchingDetail(false)
    }
  }

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirmId(id)
  }

  const confirmDeleteTactic = () => {
    if (!deleteConfirmId) return
    deleteMutation.mutate(deleteConfirmId)
    setDeleteConfirmId(null)
  }

  const preparePayloadNotes = () => {
     const payloadNotes = [...(currentNotes || [])]
     if (coachNote && coachNote.trim().length > 0) {
        payloadNotes.push({ label: `${COACH_NOTE_KEY}${coachNote}`, active: true })
     }
     return payloadNotes
  }

  const triggerSave = () => {
    if (!activeTacticId) {
      setNewTacticName(activePlayName)
      setShowSaveModal(true)
    } else {
      updateMutation.mutate({ 
        id: activeTacticId, 
        payload: { players: currentPlayers || [], notes: preparePayloadNotes() } 
      })
    }
  }

  const confirmSaveNew = () => {
    if (!newTacticName || !newTacticName.trim()) {
      toast.error('Vui lòng nhập tên chiến thuật')
      return
    }
    createMutation.mutate({ 
      name: newTacticName.trim(), 
      players: currentPlayers || [], 
      notes: preparePayloadNotes() 
    })
  }

  const benchPlayers = (rosterData || []).filter((p: any) => {
    const pName = p?.name || `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim()
    return !(currentPlayers || []).some((cp: Position) => cp?.name === pName)
  })

  const handleBenchSwap = (benchPlayer: any) => {
    if (!selectedPlayer) return;
    const bName = benchPlayer?.name || `${benchPlayer?.firstName ?? ''} ${benchPlayer?.lastName ?? ''}`.trim() || 'Unknown'
    const bInitials = (benchPlayer?.firstName?.[0] || bName.charAt(0)).toUpperCase()

    setCurrentPlayers(prev => (prev || []).map((p: Position) => {
      if (p?.name === selectedPlayer) {
        return { ...p, name: bName, initials: bInitials }
      }
      return p
    }))
    setSelectedPlayer(null)
  }

  const handlePointerDownCourt = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawMode === 'select') return;
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setCurrentPath([{ x, y }])
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMoveCourt = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    let x = ((e.clientX - rect.left) / rect.width) * 100
    let y = ((e.clientY - rect.top) / rect.height) * 100
    
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    if (drawMode === 'select' && draggingItem) {
      if (draggingItem === 'ball') {
        setBallPos({ x, y })
      } else {
        setCurrentPlayers(prev => (prev || []).map((p: Position) => p?.name === draggingItem ? { ...p, x, y } : p))
      }
    } else if (drawMode !== 'select' && currentPath) {
      setCurrentPath(prev => [...(prev || []), { x, y }])
    }
  }

  const handlePointerUpCourt = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawMode === 'select') {
      setDraggingItem(null)
    } else if (currentPath) {
      setPaths(prev => [...(prev || []), { mode: drawMode, points: currentPath }])
      setCurrentPath(null)
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const getPathStyle = (mode: DrawMode) => {
    switch(mode) {
      case 'run': return { stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: 'none' } 
      case 'pass': return { stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '4 3' } 
      case 'dribble': return { stroke: '#eab308', strokeWidth: 1.5, strokeDasharray: '1 2' } 
      default: return { stroke: '#ffffff', strokeWidth: 1.5, strokeDasharray: 'none' }
    }
  }

  return (
    <div className="w-full space-y-6 relative">
      {isFetchingDetail && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-2xl">
           <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Tactics</h1>
          <p className="text-slate-500 mt-0.5" style={{ fontSize: '0.875rem' }}>Basketball play design and lineup planning</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative shadow-sm rounded-xl">
            <select
              value={activePlayName}
              onChange={(e) => applyPresetPlay(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer text-sm"
              style={{ fontWeight: 500 }}
            >
              {Object.keys(PRESET_PLAYS || {}).map((p: string) => (
                <option key={p} value={p}>{p}</option>
              ))}
              {activeTacticId && !Object.keys(PRESET_PLAYS || {}).includes(activePlayName) && (
                 <option value={activePlayName}>{activePlayName} (Custom)</option>
              )}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          
          <button onClick={triggerSave} disabled={isSaving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Saving...' : 'Save Play'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 w-full max-w-[550px] relative">
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-30">
            <button onClick={() => setDrawMode('select')} className={`p-2.5 rounded-xl shadow-md transition-all ${drawMode === 'select' ? 'bg-blue-600 text-white' : 'bg-[#1a2332] text-slate-300 hover:bg-[#253041] border border-white/10'}`} title="Chọn / Di chuyển cầu thủ">
              <MousePointer2 size={16} />
            </button>
            <button onClick={() => setDrawMode('run')} className={`p-2.5 rounded-xl shadow-md transition-all ${drawMode === 'run' ? 'bg-red-500 text-white' : 'bg-[#1a2332] text-slate-300 hover:bg-[#253041] border border-white/10'}`} title="Vẽ đường chạy">
              <ArrowUpRight size={16} />
            </button>
            <button onClick={() => setDrawMode('pass')} className={`p-2.5 rounded-xl shadow-md transition-all ${drawMode === 'pass' ? 'bg-blue-500 text-white' : 'bg-[#1a2332] text-slate-300 hover:bg-[#253041] border border-white/10'}`} title="Vẽ đường chuyền">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4"><path d="M4 12h16"/></svg>
            </button>
            <button onClick={() => setDrawMode('dribble')} className={`p-2.5 rounded-xl shadow-md transition-all ${drawMode === 'dribble' ? 'bg-amber-500 text-white' : 'bg-[#1a2332] text-slate-300 hover:bg-[#253041] border border-white/10'}`} title="Vẽ đường dẫn bóng">
              <Activity size={16} />
            </button>
            <div className="h-px bg-white/20 my-1 mx-2" />
            <button onClick={() => setShowBall(!showBall)} className={`p-2.5 rounded-xl shadow-md transition-all ${showBall ? 'bg-orange-500 text-white' : 'bg-[#1a2332] text-slate-300 hover:bg-[#253041] border border-white/10'}`} title="Bật/Tắt quả bóng">
              <CircleDot size={16} />
            </button>
            <button onClick={() => setPaths([])} className="p-2.5 rounded-xl shadow-md bg-[#1a2332] text-rose-400 hover:bg-rose-500 hover:text-white border border-white/10 transition-all" title="Xóa tất cả nét vẽ">
              <Eraser size={16} />
            </button>
          </div>

          <div
            className={`relative rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-900 touch-none ${drawMode !== 'select' ? 'cursor-crosshair' : ''}`}
            style={{ 
              aspectRatio: '0.65', 
              background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)', 
            }}
            onPointerDown={handlePointerDownCourt}
            onPointerMove={handlePointerMoveCourt}
            onPointerUp={handlePointerUpCourt}
            onPointerLeave={handlePointerUpCourt}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 154" preserveAspectRatio="none">
              <rect x="5" y="5" width="90" height="144" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
              <line x1="5" y1="77" x2="95" y2="77" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
              <circle cx="50" cy="77" r="14" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
              <path d="M 11 5 L 11 22 A 39 39 0 0 0 89 22 L 89 5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
              <rect x="34" y="5" width="32" height="28" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
              <path d="M 34 33 A 16 16 0 0 0 66 33" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
              <path d="M 34 33 A 16 16 0 0 1 66 33" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" strokeDasharray="2 2" />
              <line x1="42" y1="11" x2="58" y2="11" stroke="#f59e0b" strokeWidth="1" />
              <circle cx="50" cy="15" r="2.5" fill="none" stroke="#f59e0b" strokeWidth="1" />
              <path d="M 11 149 L 11 132 A 39 39 0 0 1 89 132 L 89 149" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
              <rect x="34" y="121" width="32" height="28" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
              <path d="M 34 121 A 16 16 0 0 1 66 121" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
              <path d="M 34 121 A 16 16 0 0 0 66 121" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" strokeDasharray="2 2" />
              <line x1="42" y1="143" x2="58" y2="143" stroke="#f59e0b" strokeWidth="1" />
              <circle cx="50" cy="139" r="2.5" fill="none" stroke="#f59e0b" strokeWidth="1" />
            </svg>

            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 5 }}>
              {(paths || []).map((p: DrawPath, i: number) => {
                const style = getPathStyle(p.mode);
                return (
                  <polyline key={i} points={(p?.points || []).map(pt => `${pt.x},${pt.y}`).join(' ')} fill="none" stroke={style.stroke} strokeWidth={style.strokeWidth} strokeDasharray={style.strokeDasharray} strokeLinecap="round" strokeLinejoin="round" />
                )
              })}
              {currentPath && (
                <polyline points={currentPath.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="none" stroke={getPathStyle(drawMode).stroke} strokeWidth={getPathStyle(drawMode).strokeWidth} strokeDasharray={getPathStyle(drawMode).strokeDasharray} strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>

            {showBall && (
              <div
                onPointerDown={(e) => { 
                  if(drawMode === 'select') {
                    e.stopPropagation(); 
                    setDraggingItem('ball'); 
                  }
                }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-30 transition-transform ${drawMode === 'select' ? 'cursor-grab active:cursor-grabbing hover:scale-110' : ''}`}
                style={{ left: `${ballPos.x}%`, top: `${ballPos.y}%` }}
              >
                <div className="w-6 h-6 bg-orange-500 rounded-full shadow-lg border-[1.5px] border-orange-900 flex items-center justify-center overflow-hidden">
                  <svg viewBox="0 0 100 100" className="w-full h-full opacity-60 text-orange-900">
                     <path d="M50 0 V100 M0 50 H100 M20 0 A 40 40 0 0 0 20 100 M80 0 A 40 40 0 0 1 80 100" fill="none" stroke="currentColor" strokeWidth="8"/>
                  </svg>
                </div>
              </div>
            )}

            {(currentPlayers || []).map((player: Position, idx: number) => {
              const isSelected = selectedPlayer === player?.name
              return (
                <div
                  key={idx}
                  onPointerDown={(e) => { 
                    if(drawMode === 'select') {
                      e.stopPropagation(); 
                      setDraggingItem(player?.name); 
                      setSelectedPlayer(player?.name); 
                    }
                  }}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform ${drawMode === 'select' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  style={{ left: `${player?.x || 0}%`, top: `${player?.y || 0}%`, zIndex: isSelected ? 20 : 10 }}
                >
                  <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg ${isSelected ? 'ring-4 ring-white scale-110' : 'border border-white/20'}`}
                      style={{ background: player?.color || '#64748b', fontSize: '0.75rem', fontWeight: 800 }}
                    >
                      {player?.initials || '?'}
                    </div>
                    <div className="px-2 py-0.5 rounded text-white shadow-md border border-white/10" style={{ background: 'rgba(0,0,0,0.7)', fontSize: '0.55rem', fontWeight: 700, backdropFilter: 'blur(4px)' }}>
                      {player?.pos || 'N/A'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="lg:col-span-3 w-full flex flex-col gap-4 shrink-0 h-full">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex-1 min-h-[300px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-800 font-bold" style={{ fontSize: '0.9375rem' }}>Lineup</h3>
              {selectedPlayer && <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded-lg font-bold">Chọn dự bị để đổi</span>}
            </div>
            
            <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Đang trên sân</p>
            <div className="space-y-1 mb-3">
              {(currentPlayers || []).map((p: Position, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedPlayer(selectedPlayer === p?.name ? null : p?.name)}
                  className={`w-full flex items-center gap-2.5 p-1.5 rounded-lg transition-all text-left group ${selectedPlayer === p?.name ? 'bg-blue-50 ring-1 ring-blue-200 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm" style={{ background: p?.color || '#64748b', fontSize: '0.5rem', fontWeight: 700 }}>
                    {p?.initials || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`truncate ${selectedPlayer === p?.name ? 'text-blue-800 font-bold' : 'text-slate-700 font-medium'}`} style={{ fontSize: '0.8125rem' }}>{p?.name || 'Unknown'}</p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500" style={{ fontSize: '0.5625rem', fontWeight: 700 }}>
                    {p?.pos || 'N/A'}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest pt-2 border-t border-slate-100">Dự bị (Bench)</p>
            <div className="space-y-1 overflow-y-auto flex-1 pr-1 pb-2">
              {benchPlayers.length === 0 ? (
                <p className="text-slate-400 italic text-xs">Không có cầu thủ dự bị.</p>
              ) : (
                benchPlayers.map((p: any, i: number) => {
                  const pName = p?.name || `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim() || 'Unknown'
                  const pInitials = (p?.firstName?.[0] || pName.charAt(0)).toUpperCase()
                  return (
                    <button
                      key={i}
                      onClick={() => handleBenchSwap(p)}
                      className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-all text-left group border border-transparent hover:border-slate-200"
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-slate-500 bg-slate-200 shrink-0" style={{ fontSize: '0.45rem', fontWeight: 700 }}>
                        {pInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-600 font-medium truncate" style={{ fontSize: '0.75rem' }}>{pName}</p>
                      </div>
                      <span className="text-[10px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 px-2 py-0.5 rounded">Thay</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-800 mb-3 font-bold" style={{ fontSize: '0.875rem' }}>Tactical Focus</p>
            <div className="grid grid-cols-2 gap-2">
              {(currentNotes || []).filter((n: TacticNote) => !n?.label?.startsWith(COACH_NOTE_KEY)).map((note: TacticNote, i: number) => (
                <button
                  key={i}
                  onClick={() => setCurrentNotes(prev => (prev || []).map((n: TacticNote) => n?.label === note?.label ? { ...n, active: !n.active } : n))}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg border transition-all ${note?.active ? 'border-orange-200 bg-orange-50' : 'border-slate-100 bg-slate-50 opacity-60 hover:opacity-100'}`}
                >
                  <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center shrink-0 ${note?.active ? 'bg-orange-500' : 'bg-slate-200'}`}>
                    {note?.active && <svg viewBox="0 0 12 12" fill="none" width="8" height="8"><path d="M1 6l3 3 7-7" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                  </div>
                  <span className={`truncate text-left ${note?.active ? 'text-orange-900 font-semibold' : 'text-slate-600'}`} style={{ fontSize: '0.75rem' }}>{note?.label || ''}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 w-full flex flex-col gap-4 shrink-0 h-full">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <AlignLeft size={16} className="text-slate-400" />
              <p className="text-slate-800 font-bold" style={{ fontSize: '0.875rem' }}>Coach's Notes</p>
            </div>
            <textarea 
              value={coachNote}
              onChange={(e) => setCoachNote(e.target.value)}
              className="w-full flex-1 min-h-[120px] p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none text-slate-700"
              placeholder="Ghi chú chi tiết triển khai bài đánh, điểm yếu đối thủ..."
            ></textarea>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-800 font-bold" style={{ fontSize: '0.875rem' }}>Saved Playbooks</p>
              <BookOpen size={16} className="text-slate-400" />
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {isLoadingTactics ? (
                <div className="flex justify-center items-center py-6">
                  <Loader2 className="animate-spin text-blue-500 w-6 h-6" />
                </div>
              ) : tactics.length === 0 ? (
                <p className="text-slate-400 text-xs italic text-center py-4 bg-slate-50 rounded-lg">Bạn chưa lưu bài đánh nào.</p>
              ) : (
                (tactics || []).map((t: Tactic) => (
                  <div 
                    key={t?.id || Math.random().toString()} 
                    className={`group w-full flex items-center justify-between p-2 rounded-lg border transition-all ${activeTacticId === t?.id ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200'}`}
                  >
                    <button onClick={() => handleSelectSavedTactic(t)} className="flex-1 text-left truncate">
                      <span className={`truncate ${activeTacticId === t?.id ? 'text-blue-700 font-bold' : 'text-slate-700 font-medium'}`} style={{ fontSize: '0.8125rem' }}>
                        {t?.name || 'Untitled'}
                      </span>
                    </button>
                    <button 
                      onClick={(e) => handleDeleteClick(t?.id, e)} 
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Xóa bài đánh"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {showSaveModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900 font-bold">Lưu chiến thuật mới</h2>
              <button onClick={() => setShowSaveModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={16} className="text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-slate-700 block mb-1.5" style={{ fontSize: '0.875rem' }}>Tên bài đánh</label>
                <input
                  type="text"
                  value={newTacticName}
                  onChange={e => setNewTacticName(e.target.value)}
                  placeholder="Ví dụ: Lên rổ nhịp 1"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-medium"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSaveModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Hủy</button>
                <button onClick={confirmSaveNew} disabled={isSaving || !newTacticName.trim()} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {isSaving ? 'Đang lưu...' : 'Lưu lại'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xóa bài đánh</h3>
            <p className="text-sm text-slate-500 mb-6">Bạn có chắc chắn muốn xóa bài đánh này? Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition-colors">
                Hủy
              </button>
              <button onClick={confirmDeleteTactic} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 font-semibold transition-colors flex items-center justify-center">
                Xóa
              </button>
            </div>
          </div>
        </div>, 
        document.body
      )}

    </div>
  )
}