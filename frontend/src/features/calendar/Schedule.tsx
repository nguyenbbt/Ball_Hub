import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, Zap, Trophy, Users, X, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@/api/axiosClient'
import { useAuthStore } from '@/store/useAuthStore'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

type Event = {
  id: string
  date: Date
  day: number
  title: string
  time: string
  type: 'match' | 'training' | 'meeting'
  venue?: string
  opponent?: string
  confirmed?: number
  total?: number
  attendanceStatus?: 'CONFIRMED' | 'DECLINED' | null
}

type ApiEvent = {
  id: string
  title: string
  type: 'MATCH' | 'TRAINING' | 'MEETING'
  date: string
  location?: string | null
  opponent?: string | null
  confirmed?: number
  total?: number
  attendanceStatus?: 'CONFIRMED' | 'DECLINED' | null
}

const TYPE_STYLES = {
  match: { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', icon: <Trophy size={13} />, dot: '#f97316' },
  training: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', icon: <Zap size={13} />, dot: '#3b82f6' },
  meeting: { bg: '#faf5ff', border: '#ddd6fe', text: '#7c3aed', icon: <Users size={13} />, dot: '#8b5cf6' },
}

export function Schedule() {
  const { user } = useAuthStore()
  const role = user?.role?.toLowerCase()
  const queryClient = useQueryClient()

  const [currentMonth, setCurrentMonth] = useState(4)
  const [currentYear] = useState(2026)
  const [selectedDay, setSelectedDay] = useState<number | null>(17)
  const [showModal, setShowModal] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  
  const [formState, setFormState] = useState({
    title: '',
    date: '',
    time: '',
    type: 'training',
    venue: '',
    opponent: '',
  })

  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  const formatTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const mapApiEvent = (apiEvent: ApiEvent): Event => {
    const parsedDate = new Date(apiEvent.date)
    const type = apiEvent.type.toLowerCase() as Event['type']
    return {
      id: apiEvent.id,
      date: parsedDate,
      day: parsedDate.getDate(),
      title: apiEvent.title,
      time: formatTime(parsedDate),
      type,
      venue: apiEvent.location ?? undefined,
      opponent: apiEvent.opponent ?? undefined,
      confirmed: apiEvent.confirmed,
      total: apiEvent.total,
      attendanceStatus: apiEvent.attendanceStatus ?? null,
    }
  }

  // --- REACT QUERY: Fetch Data ---
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await axiosClient.get('/events')
      // Hỗ trợ cả 2 chuẩn trả về (Paginated object hoặc mảng thuần)
      const payload = response.data?.data || response.data
      const data = Array.isArray(payload) ? payload : []
      return data.map(mapApiEvent)
    }
  })

  const eventsForDay = (day: number) =>
    events.filter(e => e.day === day && e.date.getMonth() === currentMonth && e.date.getFullYear() === currentYear)
  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : []

  // --- REACT QUERY: Delete Mutation ---
  const deleteMutation = useMutation({
    mutationFn: (id: string) => axiosClient.delete(`/events/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['events'] })
      const previousEvents = queryClient.getQueryData<Event[]>(['events'])
      queryClient.setQueryData<Event[]>(['events'], old => (old || []).filter(e => e.id !== id))
      return { previousEvents }
    },
    onError: (_err, _id, context) => {
      if (context?.previousEvents) queryClient.setQueryData(['events'], context.previousEvents)
      toast.error('Không thể xóa sự kiện. Vui lòng thử lại.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setDeleteConfirmId(null)
    }
  })

  // --- REACT QUERY: Save (Create/Update) Mutation ---
  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      editingEventId
        ? axiosClient.put(`/events/${editingEventId}`, payload)
        : axiosClient.post('/events', payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['events'] })
      const previousEvents = queryClient.getQueryData<Event[]>(['events'])

      // Optimistic update cho trường hợp Edit
      if (editingEventId) {
        const updatedDate = new Date(payload.date)
        queryClient.setQueryData<Event[]>(['events'], old => (old || []).map(e =>
          e.id === editingEventId
            ? {
                ...e,
                title: payload.title,
                type: payload.type.toLowerCase() as Event['type'],
                date: updatedDate,
                day: updatedDate.getDate(),
                time: formatTime(updatedDate),
                venue: payload.location,
                opponent: payload.opponent
              }
            : e
        ))
      }
      return { previousEvents }
    },
    onSuccess: () => {
      setShowModal(false)
      setFormState({ title: '', date: '', time: '', type: 'training', venue: '', opponent: '' })
      setEditingEventId(null)
      toast.success(editingEventId ? 'Cập nhật sự kiện thành công!' : 'Tạo sự kiện thành công!')
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousEvents) queryClient.setQueryData(['events'], context.previousEvents)
      toast.error(error.response?.data?.message || 'Lỗi khi lưu sự kiện.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    }
  })

  // --- REACT QUERY: Attendance Mutation ---
  const attendanceMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string, status: 'CONFIRMED' | 'DECLINED' }) =>
      axiosClient.post(`/events/${eventId}/attendance`, { status }),
    onMutate: async ({ eventId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['events'] })
      const previousEvents = queryClient.getQueryData<Event[]>(['events'])
      queryClient.setQueryData<Event[]>(['events'], old =>
        (old || []).map(e => e.id === eventId ? { ...e, attendanceStatus: status } : e)
      )
      return { previousEvents }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousEvents) queryClient.setQueryData(['events'], context.previousEvents)
      toast.error('Lỗi khi cập nhật điểm danh')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['events'] })
  })

  const openAddModal = () => {
    setFormState({ title: '', date: '', time: '', type: 'training', venue: '', opponent: '' })
    setEditingEventId(null)
    setShowModal(true)
  }

  const openEditModal = (event: Event) => {
    const dateString = event.date.toISOString().slice(0, 10)
    setFormState({
      title: event.title,
      date: dateString,
      time: event.time,
      type: event.type,
      venue: event.venue || '',
      opponent: event.opponent || '',
    })
    setEditingEventId(event.id)
    setShowModal(true)
  }

  const handleDeleteEvent = (id: string) => {
    setDeleteConfirmId(id)
  }

  const handleSaveEvent = () => {
    if (!formState.title) return toast.error('Vui lòng nhập Tên sự kiện!')
    if (!formState.date) return toast.error('Vui lòng chọn Ngày sự kiện!')
    if (formState.type === 'match' && !formState.opponent) return toast.error('Vui lòng nhập tên Đối thủ!')

    const dateTime = new Date(`${formState.date}T${formState.time || '00:00'}`)
    if (Number.isNaN(dateTime.getTime())) return toast.error('Định dạng ngày giờ không hợp lệ!')

    const payload = {
      title: formState.title,
      type: formState.type.toUpperCase(),
      date: dateTime.toISOString(),
      location: formState.venue || undefined,
      opponent: formState.type === 'match' ? formState.opponent : undefined,
    }

    saveMutation.mutate(payload)
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Schedule</h1>
          <p className="text-slate-500 mt-0.5" style={{ fontSize: '0.875rem' }}>Manage training sessions, matches, and events</p>
        </div>
        {role === 'coach' && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            style={{ fontSize: '0.875rem', fontWeight: 500 }}
          >
            <Plus size={16} /> Add Event
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Calendar Panel */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-slate-900">{MONTHS[currentMonth]} {currentYear}</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth(m => Math.max(0, m - 1))} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <ChevronLeft size={16} className="text-slate-500" />
              </button>
              <button onClick={() => setCurrentMonth(m => Math.min(11, m + 1))} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <ChevronRight size={16} className="text-slate-500" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center py-2" style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {d}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                const dayEvents = day ? eventsForDay(day) : []
                const isSelected = day === selectedDay
                const today = new Date()
                const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()

                return (
                  <div
                    key={idx}
                    onClick={() => day && setSelectedDay(day)}
                    className={`min-h-[80px] p-2 rounded-xl cursor-pointer transition-all ${
                      day
                        ? isSelected
                          ? 'bg-blue-600 text-white'
                          : isToday
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-slate-50 border border-transparent'
                        : ''
                    }`}
                  >
                    {day && (
                      <>
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full`}
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: isToday || isSelected ? 600 : 400,
                            color: isSelected ? 'white' : isToday ? '#1d4ed8' : '#0f172a',
                            background: isToday && !isSelected ? '#dbeafe' : undefined,
                          }}
                        >
                          {day}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.slice(0, 2).map(e => (
                            <div
                              key={e.id}
                              className="w-full px-1.5 py-0.5 rounded"
                              style={{
                                background: isSelected ? 'rgba(255,255,255,0.2)' : TYPE_STYLES[e.type].bg,
                                fontSize: '0.6rem',
                                color: isSelected ? 'white' : TYPE_STYLES[e.type].text,
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {e.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <p style={{ fontSize: '0.625rem', color: isSelected ? 'rgba(255,255,255,0.7)' : '#94a3b8' }}>+{dayEvents.length - 2} more</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Day detail panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-slate-800 mb-4" style={{ fontSize: '0.9375rem' }}>
              {selectedDay ? `${MONTHS[currentMonth]} ${selectedDay}, ${currentYear}` : 'Select a day'}
            </h3>
            
            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="animate-spin text-blue-500 w-6 h-6" />
              </div>
            ) : selectedDay && selectedEvents.length === 0 ? (
              <p className="text-slate-400" style={{ fontSize: '0.875rem' }}>No events scheduled</p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map(e => {
                  const style = TYPE_STYLES[e.type]
                  return (
                    <div key={e.id} className="p-4 rounded-xl border" style={{ borderColor: style.border, background: style.bg }}>
                      <div className="flex items-start justify-between">
                        <div className="w-full">
                          <div className="flex items-center gap-2">
                            <span style={{ color: style.text }}>{style.icon}</span>
                            <span className="text-slate-900 truncate" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                              {e.title} {e.opponent ? `(vs ${e.opponent})` : ''}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>{e.time} · {e.venue || 'No venue'}</p>
                          {e.confirmed !== undefined && e.total! > 0 && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <Users size={12} className="text-slate-400" />
                              <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                {e.confirmed}/{e.total} confirmed
                              </span>
                              <div className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden" style={{ maxWidth: 60 }}>
                                <div className="h-full rounded-full" style={{ width: `${(e.confirmed! / e.total!) * 100}%`, background: style.dot }} />
                              </div>
                            </div>
                          )}
                        </div>
                        {role === 'coach' && (
                          <div className="flex items-center gap-2 ml-3">
                            <button
                              onClick={() => openEditModal(e)}
                              className="p-1.5 rounded-lg hover:bg-black/5"
                              aria-label="Edit event"
                            >
                              <Pencil size={14} className="text-slate-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(e.id)}
                              className="p-1.5 rounded-lg hover:bg-black/5"
                              aria-label="Delete event"
                            >
                              <Trash2 size={14} className="text-slate-600" />
                            </button>
                          </div>
                        )}
                      </div>
                      {role === 'player' && e.type !== 'meeting' && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => attendanceMutation.mutate({ eventId: e.id, status: 'CONFIRMED' })}
                            className="flex-1 py-1.5 rounded-lg bg-green-500 text-white"
                            style={{ fontSize: '0.75rem', fontWeight: 500 }}
                            disabled={attendanceMutation.isPending}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => attendanceMutation.mutate({ eventId: e.id, status: 'DECLINED' })}
                            className="flex-1 py-1.5 rounded-lg bg-slate-100 text-slate-600"
                            style={{ fontSize: '0.75rem', fontWeight: 500 }}
                            disabled={attendanceMutation.isPending}
                          >
                            Can't attend
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-slate-600 mb-3" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Legend</p>
            <div className="space-y-2">
              {(Object.entries(TYPE_STYLES) as [string, typeof TYPE_STYLES.match][]).map(([key, s]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.dot }} />
                  <span className="text-slate-600 capitalize" style={{ fontSize: '0.8125rem' }}>{key}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-slate-900 font-bold">{editingEventId ? 'Edit Event' : 'Add Event'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={16} className="text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-slate-700 block mb-1.5" style={{ fontSize: '0.875rem' }}>Event Title</label>
                <input
                  value={formState.title}
                  onChange={e => setFormState(state => ({ ...state, title: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  placeholder="e.g. Morning Training"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1.5" style={{ fontSize: '0.875rem' }}>Date</label>
                  <input
                    type="date"
                    value={formState.date}
                    onChange={e => setFormState(state => ({ ...state, date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1.5" style={{ fontSize: '0.875rem' }}>Time</label>
                  <input
                    type="time"
                    value={formState.time}
                    onChange={e => setFormState(state => ({ ...state, time: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-700 block mb-1.5" style={{ fontSize: '0.875rem' }}>Type</label>
                <select
                  value={formState.type}
                  onChange={e => setFormState(state => ({ ...state, type: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                >
                  <option value="training">Training</option>
                  <option value="match">Match</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>

              {formState.type === 'match' && (
                <div>
                  <label className="text-slate-700 block mb-1.5" style={{ fontSize: '0.875rem' }}>Opponent</label>
                  <input
                    value={formState.opponent}
                    onChange={e => setFormState(state => ({ ...state, opponent: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    placeholder="e.g. Manchester United"
                  />
                </div>
              )}

              <div>
                <label className="text-slate-700 block mb-1.5" style={{ fontSize: '0.875rem' }}>Venue</label>
                <input
                  value={formState.venue}
                  onChange={e => setFormState(state => ({ ...state, venue: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="Location"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors" style={{ fontWeight: 500 }}>Cancel</button>
                <button 
                  onClick={handleSaveEvent} 
                  disabled={saveMutation.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center" 
                  style={{ fontWeight: 500 }}
                >
                  {saveMutation.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : (editingEventId ? 'Save Changes' : 'Add Event')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xóa sự kiện</h3>
            <p className="text-sm text-slate-500 mb-6">Bạn có chắc chắn muốn xóa sự kiện này? Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors flex justify-center items-center"
              >
                {deleteMutation.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
export default Schedule;