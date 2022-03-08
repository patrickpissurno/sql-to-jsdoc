const { Client } = require('pg');
const config = require('./config');
const fs = require('fs');
const typeInferrer = require('./tinferrer');
const irgen = require('./irgen');
const transformer = require('./transformer');
const codegen = require('./codegen/jsdoc');

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
        const mapping = JSON.parse(fs.readFileSync('./mapping.json').toString());

        const columns = await typeInferrer(query, pg);
        console.log(columns);

        const ir = irgen(columns);
        console.log(ir);

        const ir2 = transformer(ir, mapping);
        console.log(ir2);

        const output = codegen(ir2);
        console.log(output);
    }
    finally {
        await pg.end();
    }
}