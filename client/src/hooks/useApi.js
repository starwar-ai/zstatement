import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export function useBankHeaders() {
  return useMutation({ mutationFn: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/bank/headers', formData)
    return data.headers
  }})
}

export function useUploadBank() {
  return useMutation({ mutationFn: async ({ file, mapping }) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mapping', JSON.stringify(mapping))
    const { data } = await api.post('/bank/upload', formData)
    return data
  }})
}

export function useBankTransactions(page = 1, filters = {}, sort = {}, pageSize = 50) {
  return useQuery({ 
    queryKey: ['bank', page, pageSize, filters, sort], 
    queryFn: async () => {
      const params = { page, pageSize, ...filters, ...sort };
      const { data } = await api.get('/bank/transactions', { params })
      return data
    }
  })
}

export function useDeleteBank() {
  return useMutation({ mutationFn: async () => {
    const { data } = await api.delete('/bank/transactions')
    return data
  }})
}

export function useAccountingSheets() {
  return useMutation({ mutationFn: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/accounting/sheets', formData)
    return data.sheets
  }})
}

export function useUploadAccounting() {
  return useMutation({ mutationFn: async ({ file, mapping }) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mapping', JSON.stringify(mapping))
    const { data } = await api.post('/accounting/upload', formData)
    return data
  }})
}

export function useAccountingEntries(page = 1, filters = {}, sort = {}, pageSize = 50) {
  return useQuery({ 
    queryKey: ['accounting', page, pageSize, filters, sort], 
    queryFn: async () => {
      const params = { page, pageSize, ...filters, ...sort };
      const { data } = await api.get('/accounting/entries', { params })
      return data
    }
  })
}

export function useDeleteAccounting() {
  return useMutation({ mutationFn: async () => {
    const { data } = await api.delete('/accounting/entries')
    return data
  }})
}

export function useReconciliationStats() {
  return useQuery({ queryKey: ['stats'], queryFn: async () => {
    const { data } = await api.get('/reconciliation/stats')
    return data
  }})
}

export function useRunReconciliation() {
  return useMutation({ mutationFn: async () => {
    const { data } = await api.post('/reconciliation/run')
    return data
  }})
}

export function useManualMatch() {
  return useMutation({ mutationFn: async ({ bankId, accountingId }) => {
    const { data } = await api.post('/reconciliation/match', { bankId, accountingId })
    return data
  }})
}

export function useUnmatch() {
  return useMutation({ mutationFn: async (bankId) => {
    const { data } = await api.post('/reconciliation/unmatch', { bankId })
    return data
  }})
}

export function useUnmatchedAccounting() {
  return useQuery({ 
    queryKey: ['unmatched-accounting'], 
    queryFn: async () => {
      const { data } = await api.get('/reconciliation/unmatched-accounting')
      return data
    }
  })
}
