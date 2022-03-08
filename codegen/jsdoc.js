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
            const type = TYPE_CONVERTER[ir[key]] ?? 'any';
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