/**
 * @typedef ColumnSchema
 * @property {string} name
 * @property {string} type
 */

/**
 * @typedef ForeignKeySchema
 * @property {string[]} self_columns
 * @property {string} foreign_schema
 * @property {string} foreign_table
 * @property {string[]} foreign_columns
 */

/**
 * @typedef TableSchema
 * @property {string} name
 * @property {string[]} primary_key
 * @property {ColumnSchema[]} columns
 * @property {ForeignKeySchema[]} foreign_keys
 */

/**
 * @param {import('pg').Pool} pg
 * @param {import('./lexparser').ParsedSelectExpression} expression 
 * @returns {TableSchema[]}
 */
module.exports = async function tableSchemaFetcher(pg, expression){
    // find out all involved table names

    const cte_aliases = new Set();
    const table_names_set = new Set();
    
    for(let cte of expression.ctes){
        cte_aliases.add(cte.alias)

        for(let x of cte.expression.from.map(x => x[0]).filter(x => !cte_aliases.has(x)))
            table_names_set.add(x);

        for(let x of cte.expression.joins.map(x => x.table[0]).filter(x => !cte_aliases.has(x)))
            table_names_set.add(x);
    }

    for(let x of expression.from.map(x => x[0]).filter(x => !cte_aliases.has(x)))
        table_names_set.add(x);
    
    for(let x of expression.joins.map(x => x.table[0]).filter(x => !cte_aliases.has(x)))
        table_names_set.add(x);

    const table_names = Array.from(table_names_set);

    // fetch the actual schemas

    let tables;
    let tables_index = new Map();
    {
        let _i = 1;
        const { rows } = await pg.query(`
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public' AND tablename IN (${table_names.map(x => '$' + (_i++))})
        `, table_names);

        if(rows.length < table_names.length){
            const found = new Set(rows.map(x => x.tablename));
            throw new Error(`Could not find all mentioned tables in the database. Missing tables: ${table_names.filter(x => !found.has(x)).map(x => `'${x}'`).join(', ')}.`);
        }

        tables = rows.map(x => ({
            name: x.tablename,
            primary_key: null,
            columns: [],
            foreign_keys: [],
        }));

        for(let table of tables)
            tables_index.set(table.name, table);
    }
    
    {
        const { rows } = await pg.query(`
            SELECT attrelid::regclass AS table_name, attname AS column_name, atttypid::regtype AS column_type
            FROM   pg_attribute
            WHERE  attrelid IN (${tables.map(x => `'public.${x.name}'::regclass`).join(',')}) AND attnum > 0 AND NOT attisdropped
            ORDER  BY attnum;
        `);

        for(let row of rows){
            tables_index.get(row.table_name).columns.push({ name: row.column_name, type: row.column_type });
        }
    }
    
    {
        let _i = 1;
        const { rows } = await pg.query(`
            SELECT c.conname                                 AS constraint_name,
                c.contype                                     AS constraint_type,
                sch.nspname                                   AS "self_schema",
                tbl.relname                                   AS "self_table",
                ARRAY_AGG(col.attname ORDER BY u.attposition) AS "self_columns",
                f_sch.nspname                                 AS "foreign_schema",
                f_tbl.relname                                 AS "foreign_table",
                ARRAY_AGG(f_col.attname ORDER BY f_u.attposition) AS "foreign_columns",
                pg_get_constraintdef(c.oid)                   AS definition
            FROM pg_constraint c
                    LEFT JOIN LATERAL UNNEST(c.conkey) WITH ORDINALITY AS u(attnum, attposition) ON TRUE
                    LEFT JOIN LATERAL UNNEST(c.confkey) WITH ORDINALITY AS f_u(attnum, attposition) ON f_u.attposition = u.attposition
                    JOIN pg_class tbl ON tbl.oid = c.conrelid
                    JOIN pg_namespace sch ON sch.oid = tbl.relnamespace
                    LEFT JOIN pg_attribute col ON (col.attrelid = tbl.oid AND col.attnum = u.attnum)
                    LEFT JOIN pg_class f_tbl ON f_tbl.oid = c.confrelid
                    LEFT JOIN pg_namespace f_sch ON f_sch.oid = f_tbl.relnamespace
                    LEFT JOIN pg_attribute f_col ON (f_col.attrelid = f_tbl.oid AND f_col.attnum = f_u.attnum)
            WHERE c.contype IN ('p', 'f') AND tbl.relname IN (${table_names.map(x => '$' + (_i++))})
            GROUP BY constraint_name, constraint_type, "self_schema", "self_table", definition, "foreign_schema", "foreign_table"
            ORDER BY "self_schema", "self_table";
        `, table_names);

        for(let row of rows){
            if(row.constraint_type === 'p')
                tables_index.get(row.self_table).primary_key = row.self_columns;
            else
                tables_index.get(row.self_table).foreign_keys.push({
                    self_columns: row.self_columns,
                    foreign_schema: row.foreign_schema,
                    foreign_table: row.foreign_table,
                    foreign_columns: row.foreign_columns,
                });
        }
    }

    return tables;
}