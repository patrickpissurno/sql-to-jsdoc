/** @type {import('../builtin-types')} */
const TYPE_CONVERTER = {
    'BOOL': 'boolean',
    'BYTEA': 'Buffer',
    'CHAR': 'string',
    'INT8': 'string',
    'INT2': 'number',
    'INT4': 'number',
    'REGPROC': 'string',
    'TEXT': 'string',
    'OID': 'number',
    'TID': '',
    'XID': '',
    'CID': '',
    'JSON': 'object',
    'XML': 'string',
    'PG_NODE_TREE': '',
    'PATH': '',
    'POLYGON': '',
    'CIDR': 'string',
    'FLOAT4': 'number',
    'FLOAT8': 'string',
    'CIRCLE': '{ x: number, y: number, radius: number }',
    'MACADDR8': '',
    'MONEY': 'string',
    'MACADDR': 'string',
    'INET': 'string',
    'ACLITEM': '',
    'BPCHAR': 'string',
    'VARCHAR': 'string',
    'DATE': 'string',
    'TIME': 'string',
    'TIMESTAMP': 'Date',
    'TIMESTAMPTZ': 'Date',
    'INTERVAL': `import('postgres-interval').IPostgresInterval`,
    'TIMETZ': 'string',
    'BIT': '',
    'VARBIT': '',
    'NUMERIC': 'string',
    'REFCURSOR': '',
    'REGPROCEDURE': '',
    'REGOPER': '',
    'REGOPERATOR': '',
    'REGCLASS': 'string',
    'REGTYPE': 'string',
    'UUID': 'string',
    'TXID_SNAPSHOT': '',
    'PG_LSN': '',
    'PG_NDISTINCT': '',
    'PG_DEPENDENCIES': '',
    'TSVECTOR': '',
    'TSQUERY': '',
    'GTSVECTOR': '',
    'REGCONFIG': '',
    'REGDICTIONARY': '',
    'JSONB': 'object',
    'JSONPATH': 'string',
    'REGNAMESPACE': '',
    'REGROLE': '',
    'PG_MCV_LIST': ''
};

/**
 * @param {object} ir intermediary representation
 * @returns {string}
 */
module.exports = function jsdoc(ir){
    const props = computeProps(ir);

    return `/** @type {{ rows: { ${props.join(', ')} }[] }} */`;
}

/**
 * @param {object} ir intermediary representation
 * @returns {string[]}
 */
function computeProps(ir){
    const props = [];

    for(let key in ir){
        if(typeof(ir[key]) === 'string'){
            const type = TYPE_CONVERTER[ir[key]] || 'any';
            props.push(`${escapeKey(key)}: ${type}`);
        }
        else if(Array.isArray(ir[key])){
            if(ir[key].length !== 1){
                throw new Error('not implemented');
            }
            else if(typeof(ir[key][0]) === 'object'){
                const _props = computeProps(ir[key][0]);
                props.push(`${escapeKey(key)}: { ${_props.join(', ')} }[]`);
            }
            else if(typeof(ir[key][0]) === 'string'){
                const type = TYPE_CONVERTER[ir[key][0]] || 'any';
                props.push(`${escapeKey(key)}: ${type}[]`);
            }
            else
                throw new Error('not implemented');
        }
        else if(typeof(ir[key]) === 'object'){
            const _props = computeProps(ir[key]);
            props.push(`${escapeKey(key)}: { ${_props.join(', ')} }`);
        }
        else
            throw new Error('not implemented');
    }

    return props;
}

/**
 * Escapes keys so they are valid jsdoc literals
 * @param {string} key
 * @returns {string}
 */
function escapeKey(key){
    return `'` + key.replace(/(?<!(?:[^\\]|^)\\)'/g, `\\'`) + `'`;
}