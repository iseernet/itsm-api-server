import pool from './index';

type Condition = { [key: string]: any };

export default class BaseRepository<T extends { id?: number | string }> {
    tableName: string;
    primaryKey: string;

    constructor(tableName: string, primaryKey = 'id') {
        this.tableName = tableName;
        this.primaryKey = primaryKey;
    }

    private buildWhereClause(conditions: Condition) {
        const keys = Object.keys(conditions);
        if (keys.length === 0) return { clause: '', values: [] };

        const clauses = keys.map((key, idx) => `"${key}" = $${idx + 1}`);
        const clause = 'WHERE ' + clauses.join(' AND ');
        const values = Object.values(conditions);

        return { clause, values };
    }

    async findAll(): Promise<T[]> {
        const res = await pool.query(`SELECT * FROM ${this.tableName}`);
        return res.rows;
    }

    async findById(id: number | string): Promise<T | null> {
        const res = await pool.query(
            `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
            [id]
        );
        return res.rows[0] || null;
    }

    async findBy(conditions: Condition): Promise<T[]> {
        const { clause, values } = this.buildWhereClause(conditions);
        const sql = `SELECT * FROM ${this.tableName} ${clause}`;
        const res = await pool.query(sql, values);
        return res.rows;
    }

    async insert(data: Partial<T>): Promise<void> {
        const keys = Object.keys(data);
        const values = Object.values(data);

        if (keys.length === 0) return;

        const cols = keys.map((k) => `"${k}"`).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        const sql = `INSERT INTO ${this.tableName} (${cols}) VALUES (${placeholders})`;

        await pool.query(sql, values);
    }

    async update(id: number | string, data: Partial<T>): Promise<void> {
        const keys = Object.keys(data);
        const values = Object.values(data);

        if (keys.length === 0) return;

        const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');

        const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = $${keys.length + 1}`;

        await pool.query(sql, [...values, id]);
    }

    async delete(id: number | string): Promise<void> {
        const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
        await pool.query(sql, [id]);
    }

    async batchInsert(dataArray: Partial<T>[]): Promise<void> {
        if (dataArray.length === 0) return;

        const keys = Object.keys(dataArray[0]);
        if (keys.length === 0) return;

        const valueClauses: string[] = [];
        const values: any[] = [];

        dataArray.forEach((data, index) => {
            const valuePlaceholders = keys.map((_, i) => `$${index * keys.length + i + 1}`);
            valueClauses.push(`(${valuePlaceholders.join(', ')})`);
            values.push(...keys.map((k) => (data as any)[k]));
        });

        const cols = keys.map((k) => `"${k}"`).join(', ');
        const sql = `INSERT INTO ${this.tableName} (${cols}) VALUES ${valueClauses.join(', ')}`;

        await pool.query(sql, values);
    }

    async batchInsertWithTransaction(dataArray: Partial<T>[]): Promise<void> {
        if (dataArray.length === 0) return;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const keys = Object.keys(dataArray[0]);
            if (keys.length === 0) {
                await client.query('ROLLBACK');
                return;
            }

            const valueClauses: string[] = [];
            const values: any[] = [];

            dataArray.forEach((data, index) => {
                const valuePlaceholders = keys.map((_, i) => `$${index * keys.length + i + 1}`);
                valueClauses.push(`(${valuePlaceholders.join(', ')})`);
                values.push(...keys.map((k) => (data as any)[k]));
            });

            const cols = keys.map((k) => `"${k}"`).join(', ');
            const sql = `INSERT INTO ${this.tableName} (${cols}) VALUES ${valueClauses.join(', ')}`;

            await client.query(sql, values);

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
