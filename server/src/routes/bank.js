import express from 'express';
import multer from 'multer';
import prisma from '../lib/prisma.js';
import { parseExcel, getHeaders, normalizeDate, normalizeAmount } from '../utils/excel.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { mapping } = req.body;
    const mappingObj = JSON.parse(mapping);
    const buffer = req.file.buffer;
    const data = parseExcel(buffer);
    
    const transactions = data.map((row, index) => {
      // 计算金额：收入为正，支出为负
      let amount = 0;
      if (mappingObj.incomeAmount) {
        const income = normalizeAmount(row[mappingObj.incomeAmount]);
        if (income !== null) amount += income;
      }
      if (mappingObj.expenseAmount) {
        const expense = normalizeAmount(row[mappingObj.expenseAmount]);
        if (expense !== null) amount -= Math.abs(expense);
      }
      // 如果只指定了单一金额列
      if (mappingObj.amount) {
        const singleAmount = normalizeAmount(row[mappingObj.amount]);
        if (singleAmount !== null) amount = singleAmount;
      }
      
      return {
        date: normalizeDate(row[mappingObj.date]),
        amount,
        type: amount >= 0 ? '收入' : '支出',  // 根据金额正负设置类型
        rowNo: String(index + 2),  // Excel 行号（第1行为表头，数据从第2行开始）
        description: row[mappingObj.description] || ''
      };
    }).filter(t => t.date && t.amount !== 0);
    
    await prisma.bankTransaction.deleteMany();
    await prisma.bankTransaction.createMany({ data: transactions });
    
    res.json({ success: true, count: transactions.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/headers', upload.single('file'), async (req, res) => {
  try {
    const buffer = req.file.buffer;
    const headers = getHeaders(buffer);
    res.json({ headers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    
    // 构建筛选条件
    const where = {};
    
    // 日期筛选
    if (req.query.date) {
      where.date = req.query.date;
    }
    
    // 精确金额筛选
    if (req.query.amount) {
      where.amount = parseFloat(req.query.amount);
    }
    
    // 类型筛选
    if (req.query.type) {
      where.type = req.query.type;
    }

    // 行号筛选（模糊匹配）
    if (req.query.rowNo) {
      where.rowNo = { contains: req.query.rowNo };
    }

    // 匹配状态筛选
    if (req.query.matched === 'matched') {
      where.accountingId = { not: null };
    } else if (req.query.matched === 'unmatched') {
      where.accountingId = null;
    }

    // 按 ID 列表筛选（用于金额重复高亮过滤）
    if (req.query.ids) {
      where.id = { in: req.query.ids.split(',').map(Number).filter(Boolean) };
    }
    
    const [data, total] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { accounting: true },
        orderBy: req.query.sortBy === 'rowNo'
          ? { id: req.query.sortOrder === 'asc' ? 'asc' : 'desc' }
          : { date: req.query.sortOrder === 'asc' ? 'asc' : 'desc' }
      }),
      prisma.bankTransaction.count({ where })
    ]);
    
    res.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/transactions', async (req, res) => {
  try {
    await prisma.bankTransaction.deleteMany();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export { router as bankRoutes };
