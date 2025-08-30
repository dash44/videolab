import dotenv from 'dotenv';
dotenv.config();
export const config = {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 8080)
    jwtSecret: process.env.JWT_SECRET || 'devsecret',
    logLovel: process.env.LOG_LEVEL || 'info'

};