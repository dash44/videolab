import pino from 'pino';
import { config } from './config.js';

const level = ['fatal','error','warn','info','debug','trace','silent']
    .includes((config.logLevel || '').toLowerCase())
    ? config.logLevel.toLowerCase()
    : 'info';

export const logger = pino({ level });