import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './utils/config.js';
import { limiter } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/error.js';
import router from './routes/index.js';

const app = express();
app.use(express.json());
app.use(helmet());
app.use(morgan('tiny'));
app.use(limiter);

// basic routes
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/metrics', (_req, res) => res.json({ uptime: process.uptime() }));

app.use('/', router);
app.use(errorHandler);

app.listen(config.port, () => console.log(`Server running on :${config.port}`));
