/**
 * @typedef TransformationMapping
 * @property {string|[string,string]} key
 * @property {(string|[string,string])[]} [columns]
 * @property {(TransformationMapping & ChildTransformationMapping)[]} [children]
 */

/**
 * @typedef ChildTransformationMapping
 * @property {string} rename
 */

/**
 * @param {string|[string,string]} column 
 * @returns {string} column (in)
 */
 function getColumnIn(column){
    if(typeof(column) === 'string')
        return column;
    return column[0];
}

/**
 * @param {string|[string,string]} column 
 * @returns {string} column (out)
 */
function getColumnOut(column){
    if(typeof(column) === 'string')
        return column;
    return column[1];
}

/**
 * @param {object} ir intermediary representation
 * @param {TransformationMapping} mapping transformation mapping
 * @returns {any} intermediary representation
 */
module.exports = function structureTransformer(ir, mapping){
    if(!mapping)
        return ir;

    const result = {};
    applyTransform(result, ir, mapping);

    return result;
}

/**
 * @param {any} result transformed intermediary representation
 * @param {object} ir original intermediary representation
 * @param {TransformationMapping} mapping transformation mapping
 */
function applyTransform(result, ir, mapping){
    const m = mapping;

    result[getColumnOut(m.key)] = ir[getColumnIn(m.key)];

    for(let col of (m.columns ?? []))
        result[getColumnOut(col)] = ir[getColumnIn(col)];

    for(let child of (m.children ?? [])){
        result[child.rename] = {};
        applyTransform(result[child.rename], ir, child);
    }
}