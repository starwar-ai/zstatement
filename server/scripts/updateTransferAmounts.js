import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateTransferAmounts() {
  try {
    console.log('开始更新转账数据...')
    
    // 更新银行流水中的转账记录
    const bankTransfers = await prisma.bankTransaction.findMany({
      where: {
        type: '转账'
      }
    })
    
    console.log(`找到 ${bankTransfers.length} 条银行转账记录`)
    
    for (const transfer of bankTransfers) {
      if (transfer.amount > 0) {
        const negativeAmount = -transfer.amount
        await prisma.bankTransaction.update({
          where: { id: transfer.id },
          data: { amount: negativeAmount }
        })
        console.log(`更新银行转账记录 ID ${transfer.id}: ${transfer.amount} -> ${negativeAmount}`)
      }
    }
    
    // 更新记账单中的转账记录
    const accountingTransfers = await prisma.accountingEntry.findMany({
      where: {
        type: '转账'
      }
    })
    
    console.log(`找到 ${accountingTransfers.length} 条记账转账记录`)
    
    for (const transfer of accountingTransfers) {
      if (transfer.amount > 0) {
        const negativeAmount = -transfer.amount
        await prisma.accountingEntry.update({
          where: { id: transfer.id },
          data: { amount: negativeAmount }
        })
        console.log(`更新记账转账记录 ID ${transfer.id}: ${transfer.amount} -> ${negativeAmount}`)
      }
    }
    
    console.log('转账数据更新完成!')
    
  } catch (error) {
    console.error('更新过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateTransferAmounts()