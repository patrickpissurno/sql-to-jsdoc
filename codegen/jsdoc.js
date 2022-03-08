const TYPE_CONVERTER = {
    'character': 'string',
    'character varying': 'string',
    'text': 'string',
    'integer': 'number',
    'numeric': 'number',
    'boolean': 'boolean',
    'date': 'Date',
    'timestamp': 'Date',
    'timestampz': 'Date',
    //TODO: continue adding the missing types
};

/**
 * @param {object} ir intermediary representation
 * @returns {string}
 */
module.exports = function jsdoc(ir){
    const props = [];

    for(let key in ir){
        if(typeof(ir[key]) === 'string'){
            const type = TYPE_CONVERTER[ir[key]] ?? 'any';
            props.push(`${escapeKey(key)}: ${type}`);
        }
        else
            throw new Error('not implemented');
    }

    return `/** @type {{ rows: { ${props.join(', ')} }[] }} */`;
}

/**
 * Escapes keys so they are valid jsdoc literals
 * @param {string} key
 * @returns {string}
 */
function escapeKey(key){
    return `'` + key.replace(/(?<!(?:[^\\]|^)\\)'/g, `\\'`) + `'`;
}