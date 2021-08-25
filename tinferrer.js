const { v4: uuid } = require('uuid');

/** 
 * @typedef ColumnType
 * @property {string} name
 * @property {string} type
 */

/**
 * @param {string} sql 
 * @param {import('pg').Client} pg
 * @returns {ColumnType[]}
 */
module.exports = async function typeInferrer(sql, pg){
    try {
        const tmp_table = 'tmp_' + uuid().replace(/-/g, '_');
        await pg.query('BEGIN');
        await pg.query(`CREATE TEMP TABLE ${tmp_table} AS (${sql})`);

        const { rows } = await pg.query(`
            SELECT attrelid::regclass AS table_name, attname AS column_name, atttypid::regtype AS column_type
            FROM pg_attribute
            WHERE attrelid = '${tmp_table}'::regclass AND attnum > 0 AND NOT attisdropped
            ORDER BY attnum
        `);

        return rows.map(x => ({ name: x.column_name, type: x.column_type }));
    }
    finally {
        await pg.query('ROLLBACK');
    }
}