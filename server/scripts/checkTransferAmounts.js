import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkTransferAmounts() {
  try {
    console.log('=== 银行流水转账记录 ===')
    const bankTransfers = await prisma.bankTransaction.findMany({
      where: {
        type: '转账'
      },
      orderBy: {
        id: 'asc'
      }
    })
    
    if (bankTransfers.length === 0) {
      console.log('没有找到银行转账记录')
    } else {
      bankTransfers.forEach(transfer => {
        console.log(`ID: ${transfer.id}, 日期: ${transfer.date}, 金额: ${transfer.amount}, 类型: ${transfer.type}`)
      })
    }
    
    console.log('\n=== 记账单转账记录 ===')
    const accountingTransfers = await prisma.accountingEntry.findMany({
      where: {
        type: '转账'
      },
      orderBy: {
        id: 'asc'
      }
    })
    
    if (accountingTransfers.length === 0) {
      console.log('没有找到记账转账记录')
    } else {
      accountingTransfers.forEach(transfer => {
        console.log(`ID: ${transfer.id}, 日期: ${transfer.date}, 金额: ${transfer.amount}, 类型: ${transfer.type}`)
      })
    }
    
  } catch (error) {
    console.error('查询过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTransferAmounts()