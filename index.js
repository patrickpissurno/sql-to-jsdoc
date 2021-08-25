const { Client } = require('pg');
const config = require('./config');
const fs = require('fs');
const lexparser = require('./lexparser');
const htgen = require('./htgen');
const tsfetch = require('./tsfetch');
const wildcardExpander = require('./wildcard');
const columnTracker = require('./tracker');
const typeInferrer = require('./tinferrer');
const sgen = require('./sgen');

const types = require('pg').types;
types.setTypeParser(1003, v => {
    v = v.substring(1, v.length - 1).split(',').map(x => x === 'NULL' ? null : x);
    return v.length === 1 && v[0] === null ? null : v;
});

const pg = new Client({
    host: config.DB_HOST,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASS,
    port: config.DB_PORT,
});

main();

async function main(){
    await pg.connect();
    try {
        const query = fs.readFileSync('./query.sql').toString();
        const exp = lexparser(query);

        const schemas = await tsfetch(pg, exp);
        // console.log(JSON.stringify(schemas,' ', 2));

        const ht = htgen(exp, schemas);
        console.log(JSON.stringify(ht));

        const exp2 = wildcardExpander(exp, schemas);
        console.log(exp2);

        const column_tables = columnTracker(exp2, schemas);
        console.log(column_tables);

        const types = await typeInferrer(query, pg);
        console.log(types);

        const structure = sgen(ht, column_tables, types);
        console.log(structure);
        return;

        // const query = fs.readFileSync('./query.sql').toString();

        // {
        //     try {
        //         const tmp_table = 'tmp_query1';
        //         await pg.query('BEGIN');
        //         await pg.query(`CREATE TEMP TABLE ${tmp_table} AS (${query})`);

        //         const { rows } = await pg.query(`
        //             SELECT attrelid::regclass AS table_name, attname AS column_name, atttypid::regtype AS column_type
        //             FROM   pg_attribute
        //             WHERE  attrelid = '${tmp_table}'::regclass AND attnum > 0 AND NOT attisdropped
        //             ORDER  BY attnum
        //         `);

        //         console.log(rows);
        //     }
        //     finally {
        //         await pg.query('ROLLBACK');
        //     }
        // }

        // let tables;
        // let tables_index = new Map();
        // {
        //     const { rows } = await pg.query(`
        //         SELECT tablename FROM pg_tables
        //         WHERE schemaname = 'public'
        //     `);

        //     tables = rows.map(x => ({
        //         name: x.tablename,
        //         primary_key: null,
        //         columns: [],
        //         foreign_keys: [],
        //     }));

        //     for(let table of tables)
        //         tables_index.set(table.name, table);
        // }
        
        // {
        //     const { rows } = await pg.query(`
        //         SELECT attrelid::regclass AS table_name, attname AS column_name, atttypid::regtype AS column_type
        //         FROM   pg_attribute
        //         WHERE  attrelid IN (${tables.map(x => `'public.${x.name}'::regclass`).join(',')}) AND attnum > 0 AND NOT attisdropped
        //         ORDER  BY attnum;
        //     `);

        //     for(let row of rows){
        //         tables_index.get(row.table_name).columns.push({ name: row.column_name, type: row.column_type });
        //     }
        // }
        
        // {
        //     const { rows } = await pg.query(`
        //         SELECT c.conname                                 AS constraint_name,
        //             c.contype                                     AS constraint_type,
        //             sch.nspname                                   AS "self_schema",
        //             tbl.relname                                   AS "self_table",
        //             ARRAY_AGG(col.attname ORDER BY u.attposition) AS "self_columns",
        //             f_sch.nspname                                 AS "foreign_schema",
        //             f_tbl.relname                                 AS "foreign_table",
        //             ARRAY_AGG(f_col.attname ORDER BY f_u.attposition) AS "foreign_columns",
        //             pg_get_constraintdef(c.oid)                   AS definition
        //         FROM pg_constraint c
        //                 LEFT JOIN LATERAL UNNEST(c.conkey) WITH ORDINALITY AS u(attnum, attposition) ON TRUE
        //                 LEFT JOIN LATERAL UNNEST(c.confkey) WITH ORDINALITY AS f_u(attnum, attposition) ON f_u.attposition = u.attposition
        //                 JOIN pg_class tbl ON tbl.oid = c.conrelid
        //                 JOIN pg_namespace sch ON sch.oid = tbl.relnamespace
        //                 LEFT JOIN pg_attribute col ON (col.attrelid = tbl.oid AND col.attnum = u.attnum)
        //                 LEFT JOIN pg_class f_tbl ON f_tbl.oid = c.confrelid
        //                 LEFT JOIN pg_namespace f_sch ON f_sch.oid = f_tbl.relnamespace
        //                 LEFT JOIN pg_attribute f_col ON (f_col.attrelid = f_tbl.oid AND f_col.attnum = f_u.attnum)
        //         WHERE c.contype IN ('p', 'f')
        //         GROUP BY constraint_name, constraint_type, "self_schema", "self_table", definition, "foreign_schema", "foreign_table"
        //         ORDER BY "self_schema", "self_table";
        //     `);

        //     for(let row of rows){
        //         if(row.constraint_type === 'p')
        //             tables_index.get(row.self_table).primary_key = row.self_columns;
        //         else
        //             tables_index.get(row.self_table).foreign_keys.push({
        //                 self_columns: row.self_columns,
        //                 foreign_schema: row.foreign_schema,
        //                 foreign_table: row.foreign_table,
        //                 foreign_columns: row.foreign_columns,
        //             });
        //     }
        // }

        // const generated_tables = [];
        // for(let t of tables){
        //     const gen = {
        //         name: t.name,
        //         properties: t.columns.map(x => {
        //             switch(x.type){
        //                 case 'character':
        //                 case 'character varying':
        //                 case 'text':
        //                     return { ...x, type: 'string' };
        //                 case 'integer':
        //                 case 'numeric':
        //                     return { ...x, type: 'number' };
        //                 case 'boolean':
        //                     return { ...x, type: 'boolean' };
        //                 default:
        //                     return { ...x, type: 'any' };
        //             }
        //         }),
        //     }
        //     generated_tables.push(gen);
        // }
    }
    finally {
        await pg.end();
    }
}