import pool from '../../db/index';

type ForeignKey = {
    table: string;           // 关联表名
    column: string;          // 关联列名
    onDelete?: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'NO ACTION';
};

type ColumnDefinition = {
    name: string;
    type?: string;             // 数据类型，自动生成时可省略（如autoIncrement时）
    notNull?: boolean;
    primaryKey?: boolean;
    unique?: boolean;
    autoIncrement?: boolean;   // 是否自增（只对整数类型有效）
    default?: string;          // 默认值表达式
    check?: string;            // 检查约束表达式，如 "length(name) > 0"
    comment?: string;          // 列注释
    foreignKey?: ForeignKey;   // 外键约束
};


export class DbTableCreator {
    async createTable(
        tableName: string,
        columns: ColumnDefinition[]
    ): Promise<void> {
        if (columns.length === 0) {
            throw new Error('字段定义不能为空');
        }

        const pkColumns = columns.filter(c => c.primaryKey).map(c => `"${c.name}"`);

        const columnDefs = columns.map((col) => {
            let colDef = `"${col.name}" `;

            if (col.autoIncrement) {
                // PostgreSQL自增推荐用 GENERATED AS IDENTITY（较新）
                // 也可以用 SERIAL 但 GENERATED 更标准
                colDef += `SERIAL`;
            } else {
                if (!col.type) {
                    throw new Error(`字段 ${col.name} 未指定类型`);
                }
                colDef += col.type;
            }

            if (col.notNull) colDef += ' NOT NULL';
            if (col.unique) colDef += ' UNIQUE';
            if (col.default !== undefined) colDef += ` DEFAULT ${col.default}`;
            if (col.check) colDef += ` CHECK (${col.check})`;

            return colDef;
        });

        // 主键约束
        if (pkColumns.length > 0) {
            columnDefs.push(`PRIMARY KEY (${pkColumns.join(', ')})`);
        }

        // 外键约束单独写在最后
        const foreignKeysDefs = columns
            .filter(c => c.foreignKey)
            .map((c, idx) => {
                const fk = c.foreignKey!;
                let fkDef = `CONSTRAINT fk_${tableName}_${c.name}_${idx} FOREIGN KEY ("${c.name}") REFERENCES "${fk.table}"("${fk.column}")`;
                if (fk.onDelete) fkDef += ` ON DELETE ${fk.onDelete}`;
                if (fk.onUpdate) fkDef += ` ON UPDATE ${fk.onUpdate}`;
                return fkDef;
            });

        const sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${[
            ...columnDefs,
            ...foreignKeysDefs,
        ].join(',\n  ')}\n);`;

        console.log('执行建表SQL:\n', sql);

        await pool.query(sql);

        // 注释支持（单独语句）
        for (const col of columns) {
            if (col.comment) {
                const commentSql = `COMMENT ON COLUMN "${tableName}"."${col.name}" IS '${col.comment.replace(/'/g, "''")}'`;
                await pool.query(commentSql);
            }
        }
    }
}




//调用示例
// const creator = new DbTableCreator();

// async function createExampleTable() {
//     await creator.createTable('users', [
//         { name: 'id', autoIncrement: true, primaryKey: true, comment: '主键，自增' },
//         { name: 'username', type: 'VARCHAR(50)', notNull: true, unique: true, comment: '用户名' },
//         { name: 'email', type: 'VARCHAR(100)', notNull: true, unique: true },
//         { name: 'age', type: 'INT', check: 'age > 0', default: '18' },
//         {
//             name: 'role_id',
//             type: 'INT',
//             notNull: true,
//             foreignKey: {
//                 table: 'roles',
//                 column: 'id',
//                 onDelete: 'CASCADE',
//                 onUpdate: 'CASCADE',
//             },
//         },
//     ]);
// }

// createExampleTable()
//     .then(() => console.log('表创建成功'))
//     .catch((err) => console.error('建表失败:', err));
