import { useState } from 'react'
import { useUnmatchedAccounting, useManualMatch } from '../hooks/useApi'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export default function MatchModal({ bankTransaction, onClose }) {
  const [showAll, setShowAll] = useState(false)
  const queryClient = useQueryClient()
  const { data: entries = [], isLoading } = useUnmatchedAccounting()
  const matchMut = useManualMatch()

  const filteredEntries = showAll
    ? entries
    : entries.filter(entry => Number(entry.amount) === Number(bankTransaction.amount))

  const handleMatch = async (accountingId) => {
    try {
      await matchMut.mutateAsync({ bankId: bankTransaction.id, accountingId })
      queryClient.invalidateQueries({ queryKey: ['bank'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['unmatched-accounting'] })
      toast.success('匹配成功')
      onClose()
    } catch (err) {
      toast.error(err.message || '匹配失败')
    }
  }

  const typeColors = {
    '支出': 'bg-red-100 text-red-800',
    '转账': 'bg-blue-100 text-blue-800',
    '收入': 'bg-green-100 text-green-800'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">手动匹配记账单</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 border-b bg-gray-50">
          <div className="text-sm text-gray-600 mb-2">银行流水:</div>
          <div className="flex gap-4 text-sm">
            <span>日期: <b>{bankTransaction.date}</b></span>
            <span>金额: <b>{Number(bankTransaction.amount).toFixed(2)}</b></span>
            <span>行号: <b>{bankTransaction.rowNo}</b></span>
          </div>
        </div>

        <div className="p-4 border-b">
          <div className="flex items-center gap-3 text-sm">
            {showAll ? (
              <>
                <span className="text-gray-500">显示全部未匹配记账单</span>
                <button
                  onClick={() => setShowAll(false)}
                  className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-100"
                >
                  ✕ 只看金额相同
                </button>
              </>
            ) : (
              <>
                <span className="text-gray-500">
                  金额筛选：<b className="text-blue-700">{Number(bankTransaction.amount).toFixed(2)}</b>
                  <span className="ml-1 text-gray-400">({filteredEntries.length} 条)</span>
                </span>
                <button
                  onClick={() => setShowAll(true)}
                  className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-500 hover:bg-gray-100"
                >
                  显示全部
                </button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无未匹配的记账单</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">金额</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">摘要</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{entry.date}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${typeColors[entry.type] || 'bg-gray-100'}`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm text-right ${Number(entry.amount) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {Number(entry.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">{entry.description}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleMatch(entry.id)}
                        disabled={matchMut.isPending}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        匹配
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
