import pino from 'pino';
inport { config } from './config.js';
export const logger = pino({ level: config.logLevel });