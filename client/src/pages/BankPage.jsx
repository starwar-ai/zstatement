import { useState, useRef } from 'react'
import { useBankHeaders, useUploadBank, useBankTransactions, useDeleteBank } from '../hooks/useApi'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Pagination from '../components/Pagination'
import * as XLSX from 'xlsx'

export default function BankPage() {
  const [file, setFile] = useState(null)
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({ 
    date: '', 
    incomeAmount: '', 
    expenseAmount: '', 
    description: '' 
  })
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ date: '', amount: '', type: '', matched: '' })
  const [sort, setSort] = useState({ sortBy: 'date', sortOrder: 'desc' })
  const fileRef = useRef()
  const queryClient = useQueryClient()
  
  const headersMut = useBankHeaders()
  const uploadMut = useUploadBank()
  const { data: result, isLoading } = useBankTransactions(page, filters, sort)
  const deleteMut = useDeleteBank()

  const transactions = result?.data || []
  const totalPages = result?.totalPages || 1
  const total = result?.total || 0

  const handleFileChange = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    const buffer = await f.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    const newHeaders = data[0] || []
    setHeaders(newHeaders)

    // 恢复上次保存的列匹配（仅保留在当前文件中存在的列）
    try {
      const saved = JSON.parse(localStorage.getItem('bank_column_mapping') || '{}')
      const restored = {}
      for (const key of Object.keys(saved)) {
        restored[key] = newHeaders.includes(saved[key]) ? saved[key] : ''
      }
      setMapping(prev => ({ ...prev, ...restored }))
    } catch {}
  }

  const handleUpload = async () => {
    if (!file || !mapping.date || (!mapping.incomeAmount && !mapping.expenseAmount)) {
      toast.error('请至少选择日期和一个金额列')
      return
    }
    try {
      await uploadMut.mutateAsync({ file, mapping })
      queryClient.invalidateQueries({ queryKey: ['bank'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      // 保存列匹配信息
      localStorage.setItem('bank_column_mapping', JSON.stringify(mapping))
      toast.success('上传成功')
      setFile(null)
      setHeaders([])
      setMapping({ date: '', incomeAmount: '', expenseAmount: '', description: '' })
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      toast.error(err.message || '上传失败')
    }
  }

  const handleDelete = async () => {
    if (confirm('确定要清空所有银行流水吗？')) {
      await deleteMut.mutateAsync()
      queryClient.invalidateQueries({ queryKey: ['bank'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      setFile(null)
      setHeaders([])
      setMapping({ date: '', incomeAmount: '', expenseAmount: '', description: '' })
      if (fileRef.current) fileRef.current.value = ''
      toast.success('已清空')
    }
  }

  const handleSort = (field) => {
    setSort(prev => ({
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }))
    setPage(1)
  }

  const hasFilters = Object.values(filters).some(v => v !== '')

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const [inputValues, setInputValues] = useState({ amount: '' })

  const commitInput = (key, value) => {
    handleFilterChange(key, value)
  }

  const clearFilters = () => {
    setFilters({ date: '', amount: '', type: '', matched: '' })
    setInputValues({ amount: '' })
    setPage(1)
  }

  const SortIcon = ({ field }) => {
    if (sort.sortBy !== field) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="text-blue-500 ml-1">{sort.sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">上传银行流水</h2>
        
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        
        {headers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">交易日期 *</label>
              <select
                value={mapping.date}
                onChange={(e) => setMapping({ ...mapping, date: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">请选择</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">收入金额</label>
              <select
                value={mapping.incomeAmount}
                onChange={(e) => setMapping({ ...mapping, incomeAmount: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">请选择</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">支出金额</label>
              <select
                value={mapping.expenseAmount}
                onChange={(e) => setMapping({ ...mapping, expenseAmount: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">请选择</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">摘要</label>
              <select
                value={mapping.description}
                onChange={(e) => setMapping({ ...mapping, description: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">请选择（可选）</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
        )}
        
        {headers.length > 0 && (
          <div className="flex items-center gap-4">
            <button
              onClick={handleUpload}
              disabled={uploadMut.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {uploadMut.isPending ? '上传中...' : '确认上传'}
            </button>
            <span className="text-sm text-gray-500">* 收入和支出至少选择一个</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">银行流水列表 ({total})</h2>
          <button onClick={handleDelete} className="text-red-600 hover:text-red-800 text-sm">清空数据</button>
        </div>
        
        {/* 筛选条件 */}
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
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
            value={filters.type}
            onChange={e => handleFilterChange('type', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          >
            <option value="">全部类型</option>
            <option value="收入">收入</option>
            <option value="支出">支出</option>
          </select>
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
        
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('rowNo')}
                  >行号<SortIcon field="rowNo" /></th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('date')}
                  >日期<SortIcon field="date" /></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">金额</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">摘要</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">匹配状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map(tx => (
                  <tr key={tx.id} className={tx.accountingId ? 'bg-green-50' : ''}>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{tx.rowNo || '-'}</td>
                    <td className="px-4 py-3 text-sm">{tx.date}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        tx.type === '收入' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">{tx.description}</td>
                    <td className="px-4 py-3 text-center">
                      {tx.accountingId ? (
                        <span className="text-green-600 text-sm">已匹配</span>
                      ) : (
                        <span className="text-gray-400 text-sm">未匹配</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
