import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { Package, Plus, Search, AlertTriangle, CheckCircle2, X, Pencil, Trash2, Loader2, Filter, Save } from 'lucide-react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@/api/axiosClient'

type Item = {
  id: string
  name: string
  category: string
  qty: number
  minQty: number
  condition: 'good' | 'fair' | 'poor'
  lastChecked: string
  location: string
  rawDate: string
}

type ApiItem = {
  id: string
  name: string
  category: string
  quantity: number
  minQuantity: number
  condition: 'GOOD' | 'FAIR' | 'POOR'
  location: string | null
  lastChecked: string
}

const CONDITION_STYLES = {
  good: { text: '#16a34a', bg: '#f0fdf4', label: 'Good', icon: <CheckCircle2 size={12} /> },
  fair: { text: '#ea580c', bg: '#fff7ed', label: 'Fair', icon: <AlertTriangle size={12} /> },
  poor: { text: '#dc2626', bg: '#fef2f2', label: 'Poor', icon: <AlertTriangle size={12} /> },
}

const CATEGORIES = ['All', 'Balls', 'Kits', 'Protective', 'Field', 'Fitness', 'Medical', 'Accessories']

const formatCheckedDate = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PAGE_SIZE = 20

type FormState = {
  name: string;
  category: string;
  qty: string;
  minQty: string;
  condition: string;
  location: string;
  lastChecked: string;
};

export function Inventory() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const defaultFormState: FormState = {
    name: '',
    category: CATEGORIES[1],
    qty: '',
    minQty: '',
    condition: 'GOOD',
    location: '',
    lastChecked: new Date().toISOString().split('T')[0],
  }
  
  const [formState, setFormState] = useState<FormState>(defaultFormState)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ['inventory'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axiosClient.get(`/inventory?page=${pageParam}&limit=${PAGE_SIZE}`)
      return res.data 
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage?.meta && lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    }
  })

  const inventory = useMemo(() => {
    if (!data) return [];
    const allApiItems = data.pages.flatMap((page: any) => page.data || []);
    
    return allApiItems.map((t: ApiItem): Item => {
      return {
        id: t.id,
        name: t.name,
        category: t.category,
        qty: t.quantity,
        minQty: t.minQuantity,
        condition: t.condition.toLowerCase() as 'good' | 'fair' | 'poor',
        lastChecked: formatCheckedDate(t.lastChecked),
        location: t.location || '-',
        rawDate: t.lastChecked.split('T')[0],
      }
    })
  }, [data])

  // ĐÃ FIX: Truyền biến id vào mutationFn để không bị ảnh hưởng bởi việc xóa State
  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string | null; payload: any }) => {
      if (id) {
        return axiosClient.put(`/inventory/${id}`, payload)
      } else {
        return axiosClient.post('/inventory', payload)
      }
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['inventory'] })
      const previousData = queryClient.getQueryData(['inventory'])

      queryClient.setQueryData(['inventory'], (old: any) => {
        if (!old || !old.pages) return old;
        
        const newPages = old.pages.map((page: any, index: number) => {
          let newData = [...(page.data || [])];
          
          if (id) {
             newData = newData.map(t => t.id === id ? { 
                ...t, 
                name: payload.name,
                category: payload.category,
                quantity: Number(payload.quantity),
                minQuantity: Number(payload.minQuantity),
                condition: payload.condition,
                location: payload.location,
                lastChecked: payload.lastChecked
             } : t);
          } else if (index === 0) {
             newData.unshift({
               id: `temp-${Date.now()}`,
               name: payload.name,
               category: payload.category,
               quantity: Number(payload.quantity),
               minQuantity: Number(payload.minQuantity),
               condition: payload.condition,
               location: payload.location,
               lastChecked: payload.lastChecked
             });
          }
          return { ...page, data: newData };
        });

        return { ...old, pages: newPages };
      });

      setShowModal(false)
      setEditingId(null)
      setFormState(defaultFormState)

      return { previousData }
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.id ? 'Item updated!' : 'New item added!')
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['inventory'], context.previousData)
      }
      toast.error('Failed to save item. Please try again!')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['inventory'] })
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => axiosClient.delete(`/inventory/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['inventory'] })
      const previousData = queryClient.getQueryData(['inventory'])

      queryClient.setQueryData(['inventory'], (old: any) => {
        if (!old || !old.pages) return old;
        const newPages = old.pages.map((page: any) => ({
          ...page,
          data: (page.data || []).filter((t: any) => t.id !== id)
        }));
        return { ...old, pages: newPages };
      });

      setDeleteConfirmId(null)
      return { previousData }
    },
    onSuccess: () => toast.success('Item deleted!'),
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['inventory'], context.previousData)
      }
      toast.error('Failed to delete item!')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['inventory'] })
  })

  const filtered = useMemo(() => {
    return inventory.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
      const matchCat = catFilter === 'All' || item.category === catFilter
      return matchSearch && matchCat
    })
  }, [inventory, search, catFilter])

  const lowStockCount = useMemo(() => inventory.filter(i => i.qty <= i.minQty).length, [inventory])
  const poorConditionCount = useMemo(() => inventory.filter(i => i.condition === 'poor').length, [inventory])

  const handleAddNewClick = () => {
    setEditingId(null)
    setFormState(defaultFormState)
    setShowModal(true)
  }

  const handleEditClick = (item: Item) => {
    setEditingId(item.id)
    setFormState({
      name: item.name,
      category: item.category,
      qty: item.qty.toString(),
      minQty: item.minQty.toString(),
      condition: item.condition.toUpperCase(),
      location: item.location !== '-' ? item.location : '',
      lastChecked: item.rawDate,
    })
    setShowModal(true)
  }

  const handleSaveItem = () => {
    if (!formState.name || !formState.category || !formState.qty) {
      toast.error('Please fill in name, category, and quantity.')
      return
    }

    saveMutation.mutate({
      id: editingId,
      payload: {
        name: formState.name,
        category: formState.category,
        quantity: Number(formState.qty),
        minQuantity: Number(formState.minQty) || 0,
        condition: formState.condition,
        location: formState.location,
        lastChecked: new Date(formState.lastChecked).toISOString(),
      }
    })
  }

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Inventory</h1>
          <p className="text-slate-500 mt-0.5" style={{ fontSize: '0.875rem' }}>Manage team equipment and supplies</p>
        </div>
        <button 
          onClick={handleAddNewClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          style={{ fontSize: '0.875rem', fontWeight: 500 }}
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 mb-1" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Total Items</p>
            <p className="text-slate-900" style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>{inventory.length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Package size={20} className="text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 mb-1" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Low Stock</p>
            <p className="text-amber-600" style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>{lowStockCount}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 mb-1" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Needs Replacement</p>
            <p className="text-red-600" style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>{poorConditionCount}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <X size={20} className="text-red-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items..." 
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400 text-slate-700 font-medium"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>
        ) : isError ? (
          <div className="flex justify-center py-12 text-red-500 text-sm">Error loading inventory. Please refresh the page.</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-slate-50/30">
            <Package size={32} className="mx-auto mb-3 opacity-20" />
            <p>No items found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-white">
                  <th className="px-5 py-3 font-semibold" style={{ fontSize: '0.8125rem' }}>Item Name</th>
                  <th className="px-5 py-3 font-semibold" style={{ fontSize: '0.8125rem' }}>Quantity</th>
                  <th className="px-5 py-3 font-semibold" style={{ fontSize: '0.8125rem' }}>Condition</th>
                  <th className="px-5 py-3 font-semibold" style={{ fontSize: '0.8125rem' }}>Location</th>
                  <th className="px-5 py-3 font-semibold" style={{ fontSize: '0.8125rem' }}>Last Checked</th>
                  <th className="px-5 py-3 font-semibold text-right" style={{ fontSize: '0.8125rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const isLow = item.qty <= item.minQty
                  const condStyle = CONDITION_STYLES[item.condition]
                  
                  return (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                      <td className="px-5 py-3.5">
                        <p className="text-slate-800 font-bold" style={{ fontSize: '0.875rem' }}>{item.name}</p>
                        <p className="text-slate-400" style={{ fontSize: '0.75rem' }}>{item.category}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isLow ? 'text-amber-600' : 'text-slate-700'}`} style={{ fontSize: '0.875rem' }}>
                            {item.qty}
                          </span>
                          <span className="text-slate-400" style={{ fontSize: '0.75rem' }}>/ {item.minQty} min</span>
                          {isLow && <AlertTriangle size={14} className="text-amber-500" />}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold"
                          style={{ fontSize: '0.75rem', background: condStyle.bg, color: condStyle.text }}
                        >
                          {condStyle.icon} {condStyle.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600" style={{ fontSize: '0.875rem' }}>{item.location}</td>
                      <td className="px-5 py-3.5 text-slate-500" style={{ fontSize: '0.8125rem' }}>{item.lastChecked}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            {hasNextPage && search === '' && catFilter === 'All' && (
              <div className="flex justify-center pt-4 pb-4 bg-slate-50/50 border-t border-slate-100">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-6 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 shadow-sm hover:bg-blue-50 rounded-full transition-colors flex items-center gap-2"
                >
                  {isFetchingNextPage ? <Loader2 size={14} className="animate-spin" /> : 'Load more items'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[50]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-slate-900 font-bold text-lg">{editingId ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X size={16} className="text-slate-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-slate-700 font-medium block mb-1.5 text-sm">Item Name</label>
                <input
                  value={formState.name}
                  onChange={e => setFormState({ ...formState, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="e.g., Match Balls"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-medium block mb-1.5 text-sm">Category</label>
                  <select
                    value={formState.category}
                    onChange={e => setFormState({ ...formState, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-medium block mb-1.5 text-sm">Condition</label>
                  <select
                    value={formState.condition}
                    onChange={e => setFormState({ ...formState, condition: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-medium block mb-1.5 text-sm">Current Quantity</label>
                  <input
                    type="number"
                    value={formState.qty}
                    onChange={e => setFormState({ ...formState, qty: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-medium block mb-1.5 text-sm">Minimum Threshold</label>
                  <input
                    type="number"
                    value={formState.minQty}
                    onChange={e => setFormState({ ...formState, minQty: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-medium block mb-1.5 text-sm">Storage Location</label>
                  <input
                    value={formState.location}
                    onChange={e => setFormState({ ...formState, location: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    placeholder="e.g., Storage Room A"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-medium block mb-1.5 text-sm">Last Checked Date</label>
                  <input
                    type="date"
                    value={formState.lastChecked}
                    onChange={e => setFormState({ ...formState, lastChecked: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowModal(false)} 
                  disabled={saveMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveItem} 
                  disabled={saveMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Item</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors flex justify-center"
              >
                {deleteMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  )
}