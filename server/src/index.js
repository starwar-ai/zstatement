import express from 'express';
import cors from 'cors';
import { bankRoutes } from './routes/bank.js';
import { accountingRoutes } from './routes/accounting.js';
import { reconciliationRoutes } from './routes/reconciliation.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/bank', bankRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/reconciliation', reconciliationRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
