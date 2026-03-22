import express from 'express';
import * as XLSX from 'xlsx';
import prisma from '../lib/prisma.js';

const router = express.Router();

router.post('/run', async (req, res) => {
  try {
    // 1. 清除旧匹配
    await prisma.bankTransaction.updateMany({
      where: { accountingId: { not: null } },
      data: { accountingId: null }
    });
    
    // 2. 并行查询数据
    const [bankTxnsRaw, accountingEntries] = await Promise.all([
      prisma.bankTransaction.findMany({ orderBy: { date: 'asc' } }),
      prisma.accountingEntry.findMany({ orderBy: { date: 'asc' } })
    ]);

    // 日期相同时按行号升序，保证稳定的处理顺序
    const bankTxns = bankTxnsRaw.slice().sort((a, b) =>
      a.date !== b.date ? a.date.localeCompare(b.date) : (a.rowNo || '').localeCompare(b.rowNo || '', undefined, { numeric: true })
    );
    
    // 3. 建立 Map 索引 (key: amount)
    const accMap = new Map();
    for (const acc of accountingEntries) {
      const key = `${acc.amount}`;
      if (!accMap.has(key)) accMap.set(key, []);
      accMap.get(key).push(acc);
    }
    
    console.log(`\n=== 对账开始 ===`);
    console.log(`银行流水总数: ${bankTxns.length}`);
    console.log(`记账单总数: ${accountingEntries.length}`);
    console.log(`唯一金额组合数: ${accMap.size}`);
    
    // 4. 匹配 + 收集更新
    const updates = [];
    const usedIds = new Set();
    let matchCount = 0;
    let skipCount = 0;
    
    for (const bank of bankTxns) {
      const key = `${bank.amount}`;
      const candidates = accMap.get(key) || [];
      
      console.log(`\n--- 银行流水 ${bank.id} ---`);
      console.log(`  日期: ${bank.date}`);
      console.log(`  金额: ${bank.amount}`);
      console.log(`  类型: ${bank.type}`);
      console.log(`  候选记账单数量: ${candidates.length}`);
      
      // 匹配条件：金额相同 且 记账日期 >= 流水日期
      const available = candidates.filter(c => !usedIds.has(c.id) && c.date >= bank.date);
      const match = available[0] || null;
      
      if (match) {
        updates.push({ bankId: bank.id, accId: match.id });
        usedIds.add(match.id);
        matchCount++;
        
        console.log(`  ✅ 匹配成功!`);
        console.log(`     记账单ID: ${match.id}`);
        console.log(`     记账单日期: ${match.date}`);
        console.log(`     记账单金额: ${match.amount}`);
        console.log(`     记账单类型: ${match.type}`);
        console.log(`     记账单摘要: ${match.description || '无'}`);
      } else {
        skipCount++;
        console.log(`  ❌ 无匹配项`);
        if (candidates.length > 0) {
          console.log(`     原因: 候选项已被其他银行流水使用`);
          console.log(`     已使用的候选ID: [${Array.from(usedIds).join(', ')}]`);
        } else {
          console.log(`     原因: 无相同金额的记账单`);
        }
      }
    }
    
    console.log(`\n=== 对账结束 ===`);
    console.log(`总匹配数: ${matchCount}`);
    console.log(`未匹配数: ${skipCount}`);
    console.log(`更新记录数: ${updates.length}`);
    
    // 5. 批量更新
    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map(u => prisma.bankTransaction.update({
          where: { id: u.bankId },
          data: { accountingId: u.accId }
        }))
      );
    }

    // 6. 检测歧义匹配
    // Case 1 (one-to-many):  1 条银行流水 vs N 条相同金额记账
    // Case 2 (many-to-one):  M 条银行流水 vs 1 条相同金额记账（新增）
    // Case 3 (many-to-many): M 条银行流水 vs N 条相同金额记账
    const ambiguousGroups = [];
    for (const [amountKey, accList] of accMap.entries()) {
      const amount = Number(amountKey);
      const bankList = bankTxns.filter(b => `${b.amount}` === amountKey);

      // 1:1 完全匹配，无歧义
      if (bankList.length <= 1 && accList.length <= 1) continue;

      // 此金额下产生了匹配的流水 ID 集合
      const matchedBankIds = new Set(
        updates
          .filter(u => {
            const bank = bankTxns.find(b => b.id === u.bankId);
            return bank && `${bank.amount}` === amountKey;
          })
          .map(u => u.bankId)
      );
      if (matchedBankIds.size === 0) continue; // 没有产生任何匹配，不标注

      let type;
      if (bankList.length > 1 && accList.length > 1) type = 'many-to-many';
      else if (bankList.length > 1 && accList.length === 1) type = 'many-to-one';
      else type = 'one-to-many';

      // many-to-one：所有银行流水（含未匹配）都需标记，因为都无法确认
      const relevantBanks = type === 'many-to-one'
        ? bankList
        : bankList.filter(b => matchedBankIds.has(b.id));

      ambiguousGroups.push({
        amount, type,
        bankIds: relevantBanks.map(b => b.id),
        bankRowNos: relevantBanks.map(b => b.rowNo),
        bankCount: bankList.length,
        accCount: accList.length
      });
    }

    const totalBank = bankTxns.length;
    
    res.json({ 
      success: true, 
      matched: updates.length,
      unmatched: totalBank - updates.length,
      total: totalBank,
      ambiguousGroups
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const totalBank = await prisma.bankTransaction.count();
    const matchedBank = await prisma.bankTransaction.count({
      where: { accountingId: { not: null } }
    });
    const totalAccounting = await prisma.accountingEntry.count();
    const matchedAccounting = await prisma.accountingEntry.count({
      where: { bankTransaction: { isNot: null } }
    });
    
    res.json({
      totalBank,
      matchedBank,
      unmatchedBank: totalBank - matchedBank,
      totalAccounting,
      matchedAccounting,
      unmatchedAccounting: totalAccounting - matchedAccounting
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 手动匹配
router.post('/match', async (req, res) => {
  try {
    const { bankId, accountingId } = req.body;
    await prisma.bankTransaction.update({
      where: { id: bankId },
      data: { accountingId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 解除匹配
router.post('/unmatch', async (req, res) => {
  try {
    const { bankId } = req.body;
    await prisma.bankTransaction.update({
      where: { id: bankId },
      data: { accountingId: null }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取未匹配的记账单
router.get('/unmatched-accounting', async (req, res) => {
  try {
    const entries = await prisma.accountingEntry.findMany({
      where: { bankTransaction: null },
      orderBy: { date: 'desc' }
    });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 导出对账结果
router.get('/export', async (req, res) => {
  try {
    const data = await prisma.bankTransaction.findMany({
      include: { accounting: true },
      orderBy: { id: 'asc' }
    });
    
    const rows = data.map(tx => ({
      '日期': tx.date,
      '行号': tx.rowNo,
      '金额': Number(tx.amount),
      '摘要': tx.description || '',
      '匹配状态': tx.accounting ? '已匹配' : '未匹配',
      '记账单类型': tx.accounting?.type || '',
      '记账单行号': tx.accounting?.rowNo || '',
      '记账单日期': tx.accounting?.date || '',
      '记账单摘要': tx.accounting?.description || ''
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '对账结果');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reconciliation.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export { router as reconciliationRoutes };
