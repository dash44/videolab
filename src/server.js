import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHTTP from 'pino-http';
import path from 'path';
import { config } from './config.js';
import { logger } from './logger.js';
import { limiter } from './middleware/rateLimit.js'
import { errorHandler } from './middleware/error.js';
import routes from './routes/index.js'

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(pinoHTTP({ logger }));
app.use(limiter);

app.get('/health', (req, res) => res.json({ ok: true }));
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/api/v1', routes);
app.use(errorHandler);

app.listen(config.port, () => logger.info({ port: config.port }, 'PhotoLab API listening'));
