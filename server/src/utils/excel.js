import * as XLSX from 'xlsx';

// 标准化日期格式为 YYYY-MM-DD
export function normalizeDate(value) {
  if (!value) return '';
  
  // 如果是 Excel 日期数字
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  
  const str = String(value).trim();
  
  // 处理带时间的日期格式: 2026-01-10 09:23:35
  // 提取日期部分
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(str)) {
    return str.split(' ')[0]; // 返回日期部分: 2026-01-10
  }
  
  // 处理其他带时间的变体
  if (/^\d{4}-\d{1,2}-\d{1,2}[T\s]\d{1,2}:\d{2}/.test(str)) {
    // 匹配 ISO 格式或带空格的时间格式
    const datePart = str.split(/[T\s]/)[0];
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(datePart)) {
      const [y, m, d] = datePart.split('-');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  
  // 处理 YYYY-M-D 格式（不带时间）
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // YYYY/MM/DD 格式
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // MM/DD/YYYY 或 M/D/YYYY 格式
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [m, d, y] = str.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // YYYYMMDD 格式
  if (/^\d{8}$/.test(str)) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  }
  
  return str;
}

// 标准化金额为 Decimal 字符串
export function normalizeAmount(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(String(value).replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

export function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

export function getSheetNames(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  return workbook.SheetNames;
}

export function parseExcelWithSheets(buffer, sheetNames) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const result = {};
  
  for (const name of sheetNames) {
    const sheet = workbook.Sheets[name];
    result[name] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }
  return result;
}

export function getHeaders(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  return data[0] || [];
}
