#! /usr/bin/env node

const config = require('./config');
const fs = require('fs');
const typeInferrer = require('./tinferrer');
const irgen = require('./irgen');
const transformer = require('./transformer');
const codegen = require('./codegen/jsdoc');

class CustomError extends Error {}

/** @param {string[]} args */
async function main(args){
    if(args.length < 1 || args.length > 2)
        throw new CustomError('Invalid arguments. Usage:\nnode index.js <query.sql> [mapping.json]');

    const query = fs.readFileSync(args[0]).toString();
    const mapping = args.length > 1 ? JSON.parse(fs.readFileSync(args[1]).toString()) : null;

    const columns = await typeInferrer(query, {
        DB_HOST: config.DB_HOST,
        DB_NAME: config.DB_NAME,
        DB_USER: config.DB_USER,
        DB_PASS: config.DB_PASS,
        DB_PORT: config.DB_PORT,
    });

    const ir = irgen(columns);

    const ir2 = transformer(ir, mapping);

    const output = codegen(ir2);
    console.log(output);
}

main(Array.from(process.argv).splice(2))
    .catch(err => {
        console.error(err instanceof CustomError ? err.message : err);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });