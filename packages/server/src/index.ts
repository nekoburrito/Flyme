import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports (stubbed — implement as features are built)
// import { searchRouter } from './routes/search.js';
// import { transfersRouter } from './routes/transfers.js';
// import { chatRouter } from './routes/chat.js';
// import { programsRouter } from './routes/programs.js';

const app = express();

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

// ── API Routes (uncomment as they are implemented) ───────────────────────────
// app.use('/api/search', searchRouter);
// app.use('/api/transfers', transfersRouter);
// app.use('/api/chat', chatRouter);
// app.use('/api/programs', programsRouter);

// ── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(config.PORT, () => {
  console.log(`Flyme API running on http://localhost:${config.PORT} [${config.NODE_ENV}]`);
});

export { app };
