import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { config } from './config';
import { seed } from './seed';
import emailsRouter from './routes/emails';
import graphRouter from './routes/graph';

seed();

export const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/emails', emailsRouter);
app.use('/api/graph', graphRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Backend running on http://localhost:${config.port}`);
  });
}
