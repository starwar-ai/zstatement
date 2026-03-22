import express from 'express';
import multer from 'multer';
import prisma from '../lib/prisma.js';
import { parseExcelWithSheets, getSheetNames, normalizeDate, normalizeAmount } from '../utils/excel.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { mapping } = req.body;
    const mappingObj = JSON.parse(mapping);
    const buffer = req.file.buffer;
    const sheetNames = ['支出', '转账', '收入'];
    const data = parseExcelWithSheets(buffer, sheetNames);
    
    const entries = [];
    for (const [type, rows] of Object.entries(data)) {
      for (const [rowIndex, row] of rows.entries()) {
        const date = normalizeDate(row[mappingObj.date]);
        let amount = normalizeAmount(row[mappingObj.amount]);
        
        // 根据类型调整金额正负
        if (amount !== null) {
          if (type === '支出' || type === '转账') {
            amount = Math.abs(amount) * -1;  // 支出/转账转为负数
          } else if (type === '收入') {
            amount = Math.abs(amount);       // 收入保持正数
          }
        }
        
        if (date && amount !== null) {
          entries.push({
            date,
            amount,
            description: row[mappingObj.description] || '',
            type,
            rowNo: String(rowIndex + 2)  // Excel 行号（第1行为表头，数据从第2行开始）
          });
        }
      }
    }
    
    await prisma.accountingEntry.deleteMany();
    await prisma.accountingEntry.createMany({ data: entries });
    res.json({ success: true, count: entries.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/sheets', upload.single('file'), async (req, res) => {
  try {
    const buffer = req.file.buffer;
    const sheets = getSheetNames(buffer);
    res.json({ sheets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/entries', async (req, res) => {
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

    // 匹配状态筛选
    if (req.query.matched === 'matched') {
      where.bankTransaction = { isNot: null };
    } else if (req.query.matched === 'unmatched') {
      where.bankTransaction = null;
    }
    
    const [data, total] = await Promise.all([
      prisma.accountingEntry.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { bankTransaction: true },
        orderBy: req.query.sortBy === 'rowNo'
          ? { id: req.query.sortOrder === 'asc' ? 'asc' : 'desc' }
          : { date: req.query.sortOrder === 'asc' ? 'asc' : 'desc' }
      }),
      prisma.accountingEntry.count({ where })
    ]);
    
    res.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/entries', async (req, res) => {
  try {
    await prisma.accountingEntry.deleteMany();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export { router as accountingRoutes };
