const { Client } = require('pg');
const { v4: uuid } = require('uuid');

/** 
 * @typedef ColumnType
 * @property {string} name
 * @property {string} type
 */

/** 
 * @typedef Credentials
 * @property {string} DB_HOST
 * @property {string} DB_NAME
 * @property {string} DB_USER
 * @property {string} DB_PASS
 * @property {string} DB_PORT
 */

require('pg').types.setTypeParser(1003, v => {
    v = v.substring(1, v.length - 1).split(',').map(x => x === 'NULL' ? null : x);
    return v.length === 1 && v[0] === null ? null : v;
});

/**
 * @param {string} sql 
 * @param {Credentials} credentials
 * @returns {ColumnType[]}
 */
module.exports = async function typeInferrer(sql, credentials){
    const pg = new Client({
        host: credentials.DB_HOST,
        database: credentials.DB_NAME,
        user: credentials.DB_USER,
        password: credentials.DB_PASS,
        port: credentials.DB_PORT,
    });

    await pg.connect();

    try {
        const tmp_table = 'tmp_' + uuid().replace(/-/g, '_');
        await pg.query('BEGIN');
        await pg.query(`CREATE TEMP TABLE ${tmp_table} AS (${sql})`);

        const { rows } = await pg.query(`
            SELECT a.attrelid::regclass AS table_name, a.attname AS column_name, UPPER(pt.typname) AS column_type
            FROM pg_attribute a
            JOIN pg_type pt ON (a.atttypid = pt.oid)
            WHERE a.attrelid = '${tmp_table}'::regclass AND a.attnum > 0 AND NOT a.attisdropped
            ORDER BY a.attnum
        `);

        return rows.map(x => ({ name: x.column_name, type: x.column_type }));
    }
    finally {
        await pg.query('ROLLBACK');
        await pg.end();
    }
}