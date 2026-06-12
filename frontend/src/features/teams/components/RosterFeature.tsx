import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { Search, Filter, X, Star, UserPlus, Edit2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { axiosClient } from '@/api/axiosClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useUIStore } from '@/store/useUIStore'

export type PlayerStatus = 'available' | 'injured' | 'uncertain'
export type PlayerPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C'

export type Player = {
  id: string
  name: string
  pos: PlayerPosition
  number: number
  online: boolean
  initials: string
  avatarClass: string
  age: number
  nationality: string
  points: number
  rebounds: number
  assists: number
  rating: number
  status: PlayerStatus
  height: string
  weight: string
}

type Props = {
  role?: string
}

interface ApiPlayer {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  name?: string;
  jerseyNumber?: number;
  profile?: { 
    position?: string;
    jerseyNumber?: number;
    age?: number;
    nationality?: string;
    pointsPerGame?: number;
    reboundsPerGame?: number;
    assistsPerGame?: number;
    rating?: number;
    status?: PlayerStatus;
    height?: string;
    weight?: string;
  }
}

const AVATAR_CLASSES = [
  'bg-blue-600 text-white',
  'bg-emerald-600 text-white',
  'bg-amber-500 text-white',
  'bg-indigo-600 text-white',
  'bg-rose-500 text-white',
  'bg-purple-600 text-white',
]

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  available: { label: 'Available', className: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
  injured: { label: 'Injured', className: 'bg-red-50 text-red-600 border border-red-200' },
  uncertain: { label: 'Questionable', className: 'bg-amber-50 text-amber-600 border border-amber-200' },
}

const POS_STYLES: Record<string, string> = {
  PG: 'bg-blue-50 text-blue-600',
  SG: 'bg-indigo-50 text-indigo-600',
  SF: 'bg-violet-50 text-violet-600',
  PF: 'bg-purple-50 text-purple-600',
  C: 'bg-fuchsia-50 text-fuchsia-600',
}

const buildInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'NA'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const pickAvatarClass = (id: string) => {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_CLASSES.length
  return AVATAR_CLASSES[index]
}

const normalizePosition = (pos?: string): PlayerPosition => {
  const p = (pos || '').toUpperCase()
  if (['PG', 'SG', 'SF', 'PF', 'C'].includes(p)) return p as PlayerPosition
  return 'PG' 
}

const normalizeMeasureInput = (value?: string) => {
  if (!value) return ''
  return value.replace(/[^0-9.]/g, '').trim()
}

const formatMeasure = (value?: string, unit?: 'cm' | 'kg') => {
  const numeric = normalizeMeasureInput(value)
  if (!numeric) return ''
  return unit ? `${numeric} ${unit}` : numeric
}

export function RosterFeature({ role }: Props) {
  const { user, token } = useAuthStore()
  const { setActiveChatUserId } = useUIStore()
  const queryClient = useQueryClient()
  
  const resolvedRole = role ?? user?.role ?? null
  const isCoach = typeof resolvedRole === 'string' && resolvedRole.toUpperCase() === 'COACH'
  
  const [isInviteDrawerOpen, setIsInviteDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hasCopied, setHasCopied] = useState(false)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editData, setEditData] = useState<Partial<Player>>({})

  // ĐÃ FIX: Bổ sung user?.teamId vào queryKey để tự động Load ngay khi có team
  const { data: rosterData, isLoading } = useQuery({
    queryKey: ['roster', user?.teamId],
    queryFn: async () => {
      const response = await axiosClient.get('/teams/roster')
      return response.data
    },
    enabled: !!token,
  })

  const players = useMemo(() => {
    const rosterPlayers: ApiPlayer[] = rosterData?.players || []
    return rosterPlayers.map((player, index) => {
      const profile = player.profile ?? {}
      const fullName = `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || player.name || 'Unknown Player'
      const jerseyNumber = profile.jerseyNumber ?? player.jerseyNumber ?? index + 1

      return {
        id: String(player.id ?? index + 1),
        name: fullName,
        pos: normalizePosition(profile.position),
        number: jerseyNumber,
        online: false,
        initials: buildInitials(fullName),
        avatarClass: pickAvatarClass(`${player.id ?? fullName}`),
        age: profile.age ?? 0,
        nationality: profile.nationality ?? '—',
        
        points: profile.pointsPerGame ?? 0,
        rebounds: profile.reboundsPerGame ?? 0,
        assists: profile.assistsPerGame ?? 0,
        
        rating: profile.rating ?? 0,
        status: profile.status ?? 'available',
        height: profile.height ?? '—',
        weight: profile.weight ?? '—',
      }
    })
  }, [rosterData])

  const inviteCode = rosterData?.team?.inviteCode || null
  const selected = useMemo(() => players.find(p => p.id === selectedId) || null, [players, selectedId])

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: any }) => 
      axiosClient.put(`/players/${id}/profile`, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['roster', user?.teamId] })
      const previousData = queryClient.getQueryData(['roster', user?.teamId])

      queryClient.setQueryData(['roster', user?.teamId], (old: any) => {
        if (!old) return old
        const newPlayers = (old.players || []).map((p: any) => {
          if (String(p.id) === id) {
            return {
              ...p,
              jerseyNumber: payload.jerseyNumber,
              profile: {
                ...(p.profile || {}),
                position: payload.position,
                jerseyNumber: payload.jerseyNumber,
                height: payload.height,
                weight: payload.weight,
                age: payload.age
              }
            }
          }
          return p
        })
        return { ...old, players: newPlayers }
      })

      return { previousData }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['roster', user?.teamId], context.previousData)
      }
      toast.error('Cập nhật thông tin cầu thủ thất bại.')
    },
    onSuccess: () => {
      setIsEditModalOpen(false)
      toast.success('Cập nhật thông tin thành công!')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['roster', user?.teamId] })
    }
  })

  useEffect(() => {
    if (!hasCopied) return
    const timer = setTimeout(() => setHasCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [hasCopied])

  const filtered = useMemo(() => {
    return players.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || String(p.number).includes(search)
      const matchPos = posFilter === 'all' || p.pos === posFilter
      return matchSearch && matchPos
    })
  }, [players, posFilter, search])

  const handleCopyInviteCode = async () => {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      setHasCopied(true)
    } catch (error) {
      setHasCopied(false)
    }
  }

  const handleSaveEdit = () => {
    if (!selected) return
    const heightValue = formatMeasure(editData.height, 'cm')
    const weightValue = formatMeasure(editData.weight, 'kg')
    
    updatePlayerMutation.mutate({
      id: selected.id,
      payload: {
        position: editData.pos,
        jerseyNumber: Number(editData.number),
        height: heightValue,
        weight: weightValue,
        age: Number(editData.age)
      }
    })
  }

  const openEditModal = () => {
    if (selected) {
      setEditData({
        pos: selected.pos,
        number: selected.number,
        height: normalizeMeasureInput(selected.height !== '—' ? selected.height : ''),
        weight: normalizeMeasureInput(selected.weight !== '—' ? selected.weight : ''),
        age: selected.age
      })
      setIsEditModalOpen(true)
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Roster</h1>
          <p className="text-slate-500 mt-0.5" style={{ fontSize: '0.875rem' }}>{players.length} members</p>
        </div>
        {isCoach && (
          <button
            onClick={() => setIsInviteDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
          >
            <UserPlus size={16} /> Invite players
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or jersey number..."
            className="h-auto w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600/20 shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          {['all', 'PG', 'SG', 'SF', 'PF', 'C'].map(pos => (
            <Button
              key={pos}
              onClick={() => setPosFilter(pos)}
              variant="outline"
              className={`h-auto rounded-lg px-3 py-1.5 text-xs font-medium border-slate-200 shadow-sm ${
                posFilter === pos
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {pos === 'all' ? 'All' : pos}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 items-start w-full">
        <div className={`grid gap-3 ${selected ? 'grid-cols-2' : 'grid-cols-3'} flex-1`}>
          {isLoading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500 text-sm shadow-sm">
              No players found.
            </div>
          ) : (
            filtered.map(p => {
              const isSelected = selected?.id === p.id
              const statusStyle = STATUS_STYLES[p.status]
              
              return (
                <Button
                  key={p.id}
                  onClick={() => setSelectedId(isSelected ? null : p.id)}
                  variant="ghost"
                  className={`h-auto w-full flex-col items-start justify-start rounded-xl border bg-white p-4 text-left transition-all hover:shadow-md ${
                    isSelected ? 'border-blue-400 ring-2 ring-blue-100 shadow-md' : 'border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between w-full mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm ${p.avatarClass}`}>
                          {p.initials}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                            p.online ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-slate-900 text-sm font-bold">{p.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${POS_STYLES[p.pos]} border-current`}>
                            {p.pos}
                          </span>
                          <span className="text-slate-500 text-[11px] font-medium">#{p.number}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-slate-700 text-xs font-bold">{Number(p.rating).toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-slate-900 text-sm font-bold">{Number(p.points).toFixed(1)}</p>
                        <p className="text-slate-400 text-[10px] font-semibold">PTS</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-900 text-sm font-bold">{Number(p.rebounds).toFixed(1)}</p>
                        <p className="text-slate-400 text-[10px] font-semibold">REB</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-900 text-sm font-bold">{Number(p.assists).toFixed(1)}</p>
                        <p className="text-slate-400 text-[10px] font-semibold">AST</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-medium ${statusStyle?.className || ''}`}>
                      {statusStyle?.label || p.status}
                    </span>
                  </div>
                </Button>
              )
            })
          )}
        </div>

        {selected && (
          <div className="w-72 bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-fit sticky top-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-slate-900 font-bold">Player Profile</h3>
              <Button onClick={() => setSelectedId(null)} variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100">
                <X size={14} className="text-slate-500" />
              </Button>
            </div>
            
            <div className="text-center mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-xl font-bold shadow-sm ${selected.avatarClass}`}>
                {selected.initials}
              </div>
              <p className="text-slate-900 mt-3 font-bold text-lg">{selected.name}</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border border-current ${POS_STYLES[selected.pos]}`}>
                  {selected.pos}
                </span>
                <span className="text-slate-500 text-xs font-semibold">#{selected.number}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Age', value: `${selected.age}` },
                { label: 'Rating', value: Number(selected.rating).toFixed(1) },
                { label: 'Height', value: selected.height },
                { label: 'Weight', value: selected.weight },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 text-center border border-slate-100">
                  <p className="text-slate-900 font-bold">{item.value}</p>
                  <p className="text-slate-500 mt-0.5 text-[11px] font-medium">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-slate-500 mb-3 text-xs font-bold uppercase tracking-wider">Season stats (PPG / RPG / APG)</p>
              <div className="space-y-3">
                {[
                  { label: 'Points', value: selected.points, max: 30 },
                  { label: 'Rebounds', value: selected.rebounds, max: 15 },
                  { label: 'Assists', value: selected.assists, max: 15 },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-600 text-xs font-medium">{s.label}</span>
                      <span className="text-slate-900 text-xs font-bold">{Number(s.value).toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(s.value / s.max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isCoach && (
              <div className="flex gap-2 mt-6">
                <Button onClick={openEditModal} className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold">
                  <Edit2 size={14} className="mr-1.5" /> Edit
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveChatUserId(selected.id)}
                  className="flex-1 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold shadow-sm"
                >
                  Message
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditModalOpen && selected && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md z-[10000] p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Update: {selected.name}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Position</label>
                  <select 
                    value={editData.pos || ''} 
                    onChange={e => setEditData({...editData, pos: e.target.value as PlayerPosition})}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="PG">PG (Point Guard)</option>
                    <option value="SG">SG (Shooting Guard)</option>
                    <option value="SF">SF (Small Forward)</option>
                    <option value="PF">PF (Power Forward)</option>
                    <option value="C">C (Center)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Jersey Number</label>
                  <Input 
                    type="number" 
                    value={editData.number || ''} 
                    onChange={e => setEditData({...editData, number: parseInt(e.target.value) || 0})}
                    className="h-10 rounded-lg"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Age</label>
                  <Input type="number" value={editData.age || ''} onChange={e => setEditData({...editData, age: parseInt(e.target.value) || 0})} className="h-10 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Height (cm)</label>
                  <Input type="number" value={editData.height || ''} onChange={e => setEditData({...editData, height: e.target.value || ''})} className="h-10 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Weight (kg)</label>
                  <Input type="number" value={editData.weight || ''} onChange={e => setEditData({...editData, weight: e.target.value || ''})} className="h-10 rounded-lg" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-lg">Cancel</Button>
              <Button 
                onClick={handleSaveEdit} 
                disabled={updatePlayerMutation.isPending} 
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white w-32 flex justify-center items-center"
              >
                {updatePlayerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isCoach && isInviteDrawerOpen && createPortal(
        <div className="fixed inset-0 z-[9999]">
          <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsInviteDrawerOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-[10000] w-full sm:w-96 bg-white border-l border-slate-200 shadow-xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-slate-900 font-bold text-lg">Invite Players</h2>
                <p className="text-slate-500 text-sm mt-0.5">Share this code for players to join the team.</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100" onClick={() => setIsInviteDrawerOpen(false)}>
                <X size={16} className="text-slate-500" />
              </Button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mt-2">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider text-center">Invite Code</p>
              <p className="text-blue-600 mt-2 text-3xl font-black tracking-[0.2em] text-center py-2">
                {inviteCode ?? '—'}
              </p>
            </div>

            <Button className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 py-6 text-base font-bold shadow-md shadow-blue-600/20" onClick={handleCopyInviteCode} disabled={!inviteCode}>
              {hasCopied ? 'Copied!' : 'Copy code'}
            </Button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}