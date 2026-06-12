import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, Filter, X, Pencil, Trash2, AlertTriangle, Loader2, Save } from 'lucide-react'
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@/api/axiosClient'

type Transaction = {
  id: string
  desc: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
  rawDate: string
}

type ApiTransaction = {
  id: string
  description: string
  amount: number
  transType: 'INCOME' | 'EXPENSE'
  category: string
  transDate: string
}

const CATEGORY_COLORS: Record<string, string> = {
  Sponsorship: '#16a34a',
  Equipment: '#1d4ed8',
  Fees: '#7c3aed',
  'Match Revenue': '#ea580c',
  Facilities: '#0891b2',
  Membership: '#f59e0b',
  Medical: '#dc2626',
  Transport: '#64748b',
  Training: '#0891b2',
  Prize: '#f59e0b',
}

const CATEGORIES = Object.keys(CATEGORY_COLORS)

const PAGE_SIZE = 10; 

export function Finance() {
  const queryClient = useQueryClient()
  
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  
  const defaultFormState = {
    description: '',
    amount: '',
    transType: 'INCOME',
    category: CATEGORIES[0],
    transDate: new Date().toISOString().split('T')[0],
  }
  const [formState, setFormState] = useState(defaultFormState)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ['finances'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axiosClient.get(`/finances?page=${pageParam}&limit=${PAGE_SIZE}`)
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

  const transactions = useMemo(() => {
    if (!data) return [];
    const allApiTransactions = data.pages.flatMap((page: any) => page.data || []);
    
    return allApiTransactions.map((t: ApiTransaction): Transaction => {
      const parsedDate = new Date(t.transDate)
      const readableDate = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return {
        id: t.id,
        desc: t.description,
        amount: t.transType === 'EXPENSE' ? -Math.abs(t.amount) : t.amount,
        type: t.transType === 'EXPENSE' ? 'expense' : 'income',
        category: t.category,
        date: readableDate,
        rawDate: t.transDate.split('T')[0],
      }
    })
  }, [data])

  // ĐÃ FIX: Truyền biến id vào mutationFn để không bị ảnh hưởng bởi việc xóa State
  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string | null; payload: any }) => {
      if (id) {
        return axiosClient.put(`/finances/${id}`, payload)
      } else {
        return axiosClient.post('/finances', payload)
      }
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['finances'] })
      const previousData = queryClient.getQueryData(['finances'])

      queryClient.setQueryData(['finances'], (old: any) => {
        if (!old || !old.pages) return old;
        
        const newPages = old.pages.map((page: any, index: number) => {
          let newData = [...(page.data || [])];
          
          if (id) {
             newData = newData.map(t => t.id === id ? { ...t, ...payload, amount: Number(payload.amount), transDate: payload.transDate } : t);
          } else if (index === 0) {
             newData.unshift({
               id: `temp-${Date.now()}`,
               description: payload.description,
               amount: Number(payload.amount),
               transType: payload.transType,
               category: payload.category,
               transDate: payload.transDate
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
      toast.success(variables.id ? 'Transaction updated!' : 'New transaction added!')
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['finances'], context.previousData)
      }
      toast.error('Failed to save transaction. Please try again!')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['finances'] })
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => axiosClient.delete(`/finances/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['finances'] })
      const previousData = queryClient.getQueryData(['finances'])

      queryClient.setQueryData(['finances'], (old: any) => {
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
    onSuccess: () => {
      toast.success('Transaction deleted!')
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['finances'], context.previousData)
      }
      toast.error('Failed to delete transaction!')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['finances'] })
  })

  const handleAddNewClick = () => {
    setEditingId(null)
    setFormState(defaultFormState)
    setShowModal(true)
  }

  const handleEditClick = (t: Transaction) => {
    setEditingId(t.id)
    setFormState({
      description: t.desc,
      amount: Math.abs(t.amount).toString(),
      transType: t.type === 'income' ? 'INCOME' : 'EXPENSE',
      category: t.category,
      transDate: t.rawDate,
    })
    setShowModal(true)
  }

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id)
  }

  const handleSaveTransaction = () => {
    if (!formState.description || !formState.amount) {
      toast.error('Please fill in all required fields.')
      return
    }
    
    saveMutation.mutate({
      id: editingId,
      payload: {
        description: formState.description,
        amount: Number(formState.amount),
        transType: formState.transType,
        category: formState.category,
        transDate: new Date(formState.transDate).toISOString(),
      }
    })
  }

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId)
    }
  }

  const balance = useMemo(() => transactions.reduce((sum, t) => sum + t.amount, 0), [transactions])
  const totalIncome = useMemo(
    () => transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  )
  const totalExpenses = useMemo(
    () => Math.abs(transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)),
    [transactions]
  )

  const expensesByCategory = useMemo(() => {
    const grouped = new Map<string, number>()
    transactions.forEach(t => {
      if (t.type !== 'expense') return
      const current = grouped.get(t.category) || 0
      grouped.set(t.category, current + Math.abs(t.amount))
    })

    return Array.from(grouped.entries()).map(([name, value]) => ({
      name,
      value,
      fill: CATEGORY_COLORS[name] || '#64748b',
      color: CATEGORY_COLORS[name] || '#64748b',
    }))
  }, [transactions])

  const filtered = transactions.filter(t => filter === 'all' ? true : t.type === filter)

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Finance</h1>
          <p className="text-slate-500 mt-0.5" style={{ fontSize: '0.875rem' }}>Current Season · Team budget overview</p>
        </div>
        <button 
          onClick={handleAddNewClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm" 
          style={{ fontSize: '0.875rem', fontWeight: 500 }}
        >
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={20} className="text-blue-300" />
            <p className="text-blue-200" style={{ fontSize: '0.875rem' }}>Current Balance</p>
          </div>
          <p style={{ fontSize: '2.25rem', fontWeight: 700, lineHeight: 1 }}>
            ${balance.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
              <ArrowDownLeft size={16} className="text-green-600" />
            </div>
            <p className="text-slate-500" style={{ fontSize: '0.875rem' }}>Total Income</p>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#16a34a', lineHeight: 1 }}>
            ${totalIncome.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <ArrowUpRight size={16} className="text-red-500" />
            </div>
            <p className="text-slate-500" style={{ fontSize: '0.875rem' }}>Total Expenses</p>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626', lineHeight: 1 }}>
            ${totalExpenses.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 items-start">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-800 font-bold" style={{ fontSize: '0.9375rem' }}>Transaction History</h2>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              {(['all', 'income', 'expense'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg transition-all ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  style={{ fontSize: '0.75rem', fontWeight: 500 }}
                >
                  {f === 'all' ? 'All' : f === 'income' ? 'Income' : 'Expense'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            {isLoading ? (
               <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : isError ? (
               <div className="flex justify-center py-8 text-red-500 text-sm">Error loading data. Please refresh the page.</div>
            ) : filtered.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">No transactions found.</p>
            ) : (
              <>
                {filtered.map(t => {
                  const catColor = CATEGORY_COLORS[t.category] || '#64748b'
                  return (
                    <div key={t.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: catColor + '18' }}>
                          {t.type === 'income' ? (
                            <ArrowDownLeft size={18} style={{ color: catColor }} />
                          ) : (
                            <ArrowUpRight size={18} style={{ color: catColor }} />
                          )}
                        </div>
                        <div>
                          <p className="text-slate-800 font-medium" style={{ fontSize: '0.875rem' }}>{t.desc}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded border" style={{ borderColor: catColor+'30', color: catColor, fontSize: '0.625rem', fontWeight: 600 }}>
                              {t.category}
                            </span>
                            <span className="text-slate-400" style={{ fontSize: '0.6875rem' }}>{t.date}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditClick(t)} 
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(t.id)} 
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: t.type === 'income' ? '#16a34a' : '#dc2626' }}>
                          {t.type === 'income' ? '+' : ''}${Math.abs(t.amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )
                })}
                
                {hasNextPage && filter === 'all' && (
                  <div className="flex justify-center pt-4 pb-2 border-t border-slate-100 mt-2">
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="px-6 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors flex items-center gap-2"
                    >
                      {isFetchingNextPage ? <Loader2 size={14} className="animate-spin" /> : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 sticky top-6">
          <h2 className="text-slate-800 mb-4 font-bold" style={{ fontSize: '0.9375rem' }}>Expense Distribution</h2>
          {expensesByCategory.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">No expense data yet.</p>
          ) : (
              <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie 
                        data={expensesByCategory} 
                        cx="50%" cy="50%" 
                        innerRadius={60} outerRadius={90} 
                        paddingAngle={3} dataKey="value"
                      />
                      <Tooltip
                        formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: 'white', fontSize: 12, fontWeight: 500 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-1">
                    {expensesByCategory.map((cat, i) => (
                      <div key={i} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: cat.color }} />
                          <span className="text-slate-600 font-medium" style={{ fontSize: '0.8125rem' }}>{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400" style={{ fontSize: '0.75rem' }}>
                            {Math.round((cat.value / totalExpenses) * 100)}%
                          </span>
                          <span className="text-slate-800" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                            ${cat.value.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
              </>
          )}
        </div>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-slate-900 font-bold text-lg">
                {editingId ? 'Edit Transaction' : 'Add New Transaction'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X size={16} className="text-slate-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-slate-700 font-medium block mb-1.5 text-sm">Description</label>
                <input
                  value={formState.description}
                  onChange={e => setFormState({ ...formState, description: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="e.g., Training balls"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-medium block mb-1.5 text-sm">Amount ($)</label>
                  <input
                    type="number"
                    value={formState.amount}
                    onChange={e => setFormState({ ...formState, amount: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-semibold"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-medium block mb-1.5 text-sm">Transaction Type</label>
                  <select
                    value={formState.transType}
                    onChange={e => setFormState({ ...formState, transType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-medium block mb-1.5 text-sm">Category</label>
                  <select
                    value={formState.category}
                    onChange={e => setFormState({ ...formState, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-medium block mb-1.5 text-sm">Transaction Date</label>
                  <input
                    type="date"
                    value={formState.transDate}
                    onChange={e => setFormState({ ...formState, transDate: e.target.value })}
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
                  onClick={handleSaveTransaction} 
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Transaction</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete this transaction? The balance will be updated immediately.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  )
}