import { useState, useRef } from 'react'
import { useBankTransactions, useUnmatch } from '../hooks/useApi'
import { useQueryClient } from '@tanstack/react-query'
import Pagination from '../components/Pagination'
import MatchModal from '../components/MatchModal'
import toast from 'react-hot-toast'

export default function ResultPage({ ambiguousMap = new Map() }) {
  const [page, setPage] = useState(1)
  const [matchingTx, setMatchingTx] = useState(null)
  const [sort, setSort] = useState({ sortBy: 'rowNo', sortOrder: 'asc' })
  const [showOnlyAmbiguous, setShowOnlyAmbiguous] = useState(false)
  const [filters, setFilters] = useState({ rowNo: '', date: '', amount: '', matched: '' })
  const [inputValues, setInputValues] = useState({ rowNo: '', amount: '' })
  const queryClient = useQueryClient()

  const ambiguousTotal = ambiguousMap.size
  const ambiguousIds = Array.from(ambiguousMap.keys())

  // When ambiguous filter is active, merge with user filters
  const userFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  const activeFilters = showOnlyAmbiguous && ambiguousIds.length > 0
    ? { ids: ambiguousIds.join(','), ...userFilters }
    : userFilters
  const activePageSize = showOnlyAmbiguous ? Math.max(ambiguousTotal, 50) : 50

  const hasFilters = showOnlyAmbiguous || Object.values(filters).some(v => v !== '')

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({ rowNo: '', date: '', amount: '', matched: '' })
    setInputValues({ rowNo: '', amount: '' })
    setShowOnlyAmbiguous(false)
    setPage(1)
  }

  const commitInput = (key, value) => {
    handleFilterChange(key, value)
  }

  // 列宽拖拽：[行号, 日期, 类型, 金额, 摘要, 匹配记账单, 操作]
  const [colWidths, setColWidths] = useState([72, 106, 72, 100, 180, 270, 100])
  const handleResizeStart = (e, colIndex) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = colWidths[colIndex]
    const onMouseMove = (e) => {
      const newWidth = Math.max(50, startWidth + e.clientX - startX)
      setColWidths(prev => { const next = [...prev]; next[colIndex] = newWidth; return next })
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const { data: result, isLoading } = useBankTransactions(page, activeFilters, sort, activePageSize)
  const unmatchMut = useUnmatch()

  const transactions = result?.data || []
  const totalPages = result?.totalPages || 1
  const total = result?.total || 0

  const handleSort = (field) => {
    setSort(prev => ({
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }))
    setPage(1)
  }

  const SortIcon = ({ field }) => {
    if (sort.sortBy !== field) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="text-blue-500 ml-1">{sort.sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const handleUnmatch = async (bankId) => {
    try {
      await unmatchMut.mutateAsync(bankId)
      queryClient.invalidateQueries({ queryKey: ['bank'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('已解除匹配')
    } catch (err) {
      toast.error(err.message || '操作失败')
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">银行流水对账结果 ({total})</h2>
        <button
          onClick={() => window.open('/api/reconciliation/export', '_blank')}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
        >
          导出 Excel
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        {ambiguousTotal > 0 && (
          <button
            onClick={() => { setShowOnlyAmbiguous(v => !v); setPage(1) }}
            className={`px-3 py-1.5 text-sm rounded border font-medium transition-colors ${
              showOnlyAmbiguous
                ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                : 'bg-white text-amber-600 border-amber-400 hover:bg-amber-50'
            }`}
          >
            ⚠️ 金额重复 {ambiguousTotal} 条
          </button>
        )}
        <input
          type="text"
          placeholder="行号 (Enter 确认)"
          value={inputValues.rowNo}
          onChange={e => setInputValues(prev => ({ ...prev, rowNo: e.target.value }))}
          onBlur={e => commitInput('rowNo', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && commitInput('rowNo', e.target.value)}
          className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <input
          type="date"
          value={filters.date}
          onChange={e => handleFilterChange('date', e.target.value)}
          className="w-38 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <input
          type="number"
          placeholder="金额 (Enter 确认)"
          value={inputValues.amount}
          onChange={e => setInputValues(prev => ({ ...prev, amount: e.target.value }))}
          onBlur={e => commitInput('amount', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && commitInput('amount', e.target.value)}
          className="w-36 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <select
          value={filters.matched}
          onChange={e => handleFilterChange('matched', e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        >
          <option value="">全部状态</option>
          <option value="matched">已匹配</option>
          <option value="unmatched">未匹配</option>
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-100 flex items-center gap-1"
          >
            ✕ 清除筛选
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table style={{ tableLayout: 'fixed', width: '100%', minWidth: colWidths.reduce((a, b) => a + b, 0) }} className="divide-y divide-gray-200">
          <colgroup>
            {colWidths.slice(0, 6).map((w, i) => <col key={i} style={{ width: w }} />)}
            <col key={6} />
          </colgroup>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none relative overflow-hidden"
                onClick={() => handleSort('rowNo')}>
                行号<SortIcon field="rowNo" />
                <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400" onMouseDown={(e) => handleResizeStart(e, 0)} onClick={(e) => e.stopPropagation()} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none relative overflow-hidden"
                onClick={() => handleSort('date')}>
                日期<SortIcon field="date" />
                <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400" onMouseDown={(e) => handleResizeStart(e, 1)} onClick={(e) => e.stopPropagation()} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase select-none relative overflow-hidden">
                类型
                <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400" onMouseDown={(e) => handleResizeStart(e, 2)} onClick={(e) => e.stopPropagation()} />
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase select-none relative overflow-hidden">
                金额
                <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400" onMouseDown={(e) => handleResizeStart(e, 3)} onClick={(e) => e.stopPropagation()} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase select-none relative overflow-hidden">
                摘要
                <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400" onMouseDown={(e) => handleResizeStart(e, 4)} onClick={(e) => e.stopPropagation()} />
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase select-none relative overflow-hidden">
                匹配记账单
                <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400" onMouseDown={(e) => handleResizeStart(e, 5)} onClick={(e) => e.stopPropagation()} />
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase select-none relative overflow-hidden">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map(tx => {
              const ambiguousInfo = ambiguousMap.get(tx.id)
              const isAmbiguous = !!ambiguousInfo
              const ambiguousLabel = isAmbiguous
                ? ambiguousInfo.type === 'one-to-many'
                  ? `⚠️ 金额重复：该金额有 ${ambiguousInfo.accCount} 条记账记录，无法确定正确匹配`
                  : ambiguousInfo.type === 'many-to-one'
                  ? `⚠️ 多流水歧义：该金额有 ${ambiguousInfo.bankCount} 条流水对应同一条记账，无法确定正确匹配`
                  : `⚠️ 多对多歧义：${ambiguousInfo.bankCount} 条流水 / ${ambiguousInfo.accCount} 条记账（金额相同）`
                : null
              return (
              <tr key={tx.id} className={
                isAmbiguous ? 'bg-amber-50' :
                tx.accounting ? 'bg-green-50' : 'bg-white'
              }>
                <td className="px-4 py-3 text-sm font-mono text-gray-500 overflow-hidden truncate">{tx.rowNo || '-'}</td>
                <td className="px-4 py-3 text-sm overflow-hidden">{tx.date}</td>
                <td className="px-4 py-3 text-sm overflow-hidden">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    tx.type === '收入' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {tx.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right overflow-hidden">
                  {Number(tx.amount).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm overflow-hidden truncate">{tx.description}</td>
                <td className="px-4 py-3 overflow-hidden">
                  {tx.accounting ? (
                    <div className="text-sm">
                      <div className={`font-medium flex items-center gap-1 flex-wrap ${isAmbiguous ? 'text-amber-700' : 'text-green-600'}`}>
                        {isAmbiguous ? ambiguousLabel : '已匹配'}
                        
                      </div>

                      <div className="text-gray-500 mt-0.5">{tx.accounting.type}: 行{tx.accounting.rowNo}</div>
                      <div className="text-gray-500 mt-0.5">日期: {tx.accounting.date}</div>
                      <div className="text-gray-500 mt-0.5">摘要: {tx.accounting.description}</div>
                    </div>
                  ) : (
                    isAmbiguous
                      ? <span className="text-amber-600 text-sm font-medium">{ambiguousLabel}</span>
                      : <span className="text-gray-400 text-sm">未匹配</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col gap-1 items-center">
                    {tx.accounting && (
                      <button
                        onClick={() => handleUnmatch(tx.id)}
                        disabled={unmatchMut.isPending}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                      >
                        解除匹配
                      </button>
                    )}
                    {(isAmbiguous || !tx.accounting) && (
                      <button
                        onClick={() => setMatchingTx(tx)}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        手动匹配
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {matchingTx && (
        <MatchModal 
          bankTransaction={matchingTx} 
          onClose={() => setMatchingTx(null)} 
        />
      )}
    </div>
  )
}
