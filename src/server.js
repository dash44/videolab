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
import { fileURLToPath } from 'url';


const app = express();
const port = 8080;
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use(express.static(path.join(__dirname, '../public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'))
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            mediaSrc: ["'self'", "blob:"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"]
        }
    }
}));
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(pinoHTTP({ logger }));
app.use(limiter);

app.get('/health', (req, res) => res.json({ ok: true }));
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/api/v1', routes);
app.use(errorHandler);
app.get('/', (req, res) => {
    res.send('Welcome to VideoLab API!');
});


app.listen(config.port, () => {
    logger.info(`VideoLab API listening on port ${config.port}`);
});