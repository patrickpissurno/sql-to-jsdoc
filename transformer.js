/**
 * @typedef Transformation
 * @property {string|[string,string]} key
 * @property {(string|[string,string])[]} [columns]
 * @property {(Transformation & ChildTransformation)[]} [children]
 */

/**
 * @typedef ChildTransformation
 * @property {string} rename
 * @property {boolean} [single] cannot be true when flat is true
 * @property {boolean} [flat] cannot be true when single is true
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
    return column[1] ?? null;
}

/**
 * @param {object} ir intermediary representation
 * @param {Transformation} mapping transformation mapping
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
 * @param {Transformation} mapping transformation mapping
 */
function applyTransform(result, ir, mapping){
    const m = mapping;

    if(getColumnOut(m.key) != null)
        result[getColumnOut(m.key)] = ir[getColumnIn(m.key)];

    for(let col of (m.columns ?? [])){
        if(getColumnOut(col) != null)
            result[getColumnOut(col)] = ir[getColumnIn(col)];
    }

    for(let child of (m.children ?? [])){
        const r = {};
        applyTransform(r, ir, child);

        if(child.flat){
            for(let key in r){
                result[child.rename] = [r[key]];
                break;
            }
        }
        else {
            result[child.rename] = child.single ? r : [r];
        }
    }
}