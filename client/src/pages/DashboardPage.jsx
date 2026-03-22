import { useState } from 'react'
import { useReconciliationStats, useRunReconciliation } from '../hooks/useApi'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import ResultPage from './ResultPage'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: stats, isLoading } = useReconciliationStats()
  const runMut = useRunReconciliation()
  const [ambiguousGroups, setAmbiguousGroups] = useState([])

  const handleRunReconciliation = async () => {
    try {
      const result = await runMut.mutateAsync()
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['bank'] })
      setAmbiguousGroups(result.ambiguousGroups || [])
      if (result.ambiguousGroups?.length > 0) {
        toast(`对账完成！匹配成功: ${result.matched} 笔，未匹配: ${result.unmatched} 笔。发现 ${result.ambiguousGroups.length} 组金额重复，请核实`, { icon: '⚠️' })
      } else {
        toast.success(`对账完成！匹配成功: ${result.matched} 笔，未匹配: ${result.unmatched} 笔`)
      }
    } catch (err) {
      toast.error(err.message || '对账失败')
    }
  }

  // Map<bankId, { type, amount, bankCount, accCount }>
  const ambiguousMap = new Map()
  for (const g of ambiguousGroups) {
    for (const bankId of g.bankIds) {
      ambiguousMap.set(bankId, { type: g.type, amount: g.amount, bankCount: g.bankCount, accCount: g.accCount })
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>
  }

  const hasData = stats?.totalBank > 0 && stats?.totalAccounting > 0

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-6">对账面板</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{stats?.totalBank || 0}</div>
            <div className="text-sm text-gray-600 mb-2">银行流水总数</div>
            <button
              onClick={() => navigate('/bank')}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              上传流水 →
            </button>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{stats?.totalAccounting || 0}</div>
            <div className="text-sm text-gray-600 mb-2">记账单总数</div>
            <button
              onClick={() => navigate('/accounting')}
              className="text-xs text-purple-600 hover:text-purple-800 hover:underline"
            >
              上传记账单 →
            </button>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{stats?.matchedBank || 0}</div>
            <div className="text-sm text-gray-600">已匹配</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">{stats?.unmatchedBank || 0}</div>
            <div className="text-sm text-gray-600">未匹配</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleRunReconciliation}
            disabled={runMut.isPending || !hasData}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {runMut.isPending ? '对账中...' : '执行对账'}
          </button>
          {!hasData && (
            <p className="text-sm text-gray-500">请先上传银行流水和记账单数据</p>
          )}
        </div>
      </div>



      <div className="mt-6">
        {ambiguousGroups.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 text-lg">⚠️</span>
              <div>
                <div className="font-semibold text-amber-800 mb-2">
                  发现 {ambiguousGroups.length} 组金额重复，自动匹配结果可能有误，请核实
                </div>
                <div className="text-sm text-amber-700 space-y-1">
                  {ambiguousGroups.map((g, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <span>{g.type === 'one-to-many' ? '🔸' : g.type === 'many-to-one' ? '🔷' : '🔶'}</span>
                      <span>
                        金额 <b>{g.amount.toFixed(2)}</b>：
                        {g.type === 'one-to-many'
                          ? `1 条流水 对应 ${g.accCount} 条记账记录（金额相同），无法确定正确匹配`
                          : g.type === 'many-to-one'
                          ? `${g.bankCount} 条流水 对应同一条记账记录（金额相同），无法确定哪条流水匹配`
                          : `${g.bankCount} 条流水 对应 ${g.accCount} 条记账记录（金额均相同），存在多对多歧义`}
                        {g.bankRowNos?.length > 0 && (
                          <span className="text-amber-600">，受影响行号: [{g.bankRowNos.join(', ')}]</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-amber-600 mt-2">请在下方对账结果中找到黄色高亮行，解除匹配后重新手动匹配</div>
              </div>
            </div>
          </div>
        )}
        <ResultPage ambiguousMap={ambiguousMap} />
      </div>
    </div>
  )
}
