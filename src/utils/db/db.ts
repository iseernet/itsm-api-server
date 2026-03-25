// utils/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// 测试连接
pool.connect()
    .then(client => {
        console.log('PostgreSQL connected');
        client.release();
    })
    .catch(err => {
        console.error('PostgreSQL connection error', err.stack);
    });
