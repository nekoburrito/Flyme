import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { programsRouter } from './routes/programs.js';
import { transfersRouter } from './routes/transfers.js';
import { transferGraphService } from './services/rewards/transfer-graph.service.js';
// import { searchRouter } from './routes/search.js';
// import { chatRouter } from './routes/chat.js';

const app: Express = express();

// ── Security & transport middleware ──────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: config.ALLOWED_ORIGINS.split(','),
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.NODE_ENV });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/programs', programsRouter);
app.use('/api/transfers', transfersRouter);
// app.use('/api/search', searchRouter);
// app.use('/api/chat', chatRouter);

// ── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────────────────────
transferGraphService
  .initialize()
  .then(() => {
    app.listen(config.PORT, () => {
      console.log(`Flyme API running on http://localhost:${config.PORT} [${config.NODE_ENV}]`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize transfer graph — exiting', err);
    process.exit(1);
  });

export { app };
