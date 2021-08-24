/**
 * @param {import('./lexparser').ParsedSelectExpression} expression 
 * @param {import('./tsfetch').TableSchema[]} schemas 
 * @returns {import('./lexparser').ParsedSelectExpression}
 */
module.exports = function wildcardExpander(expression, schemas){
    /** @type {Map<string, import('./tsfetch').TableSchema>} */
    const smap = new Map();
    for(let s of schemas)
        smap.set(s.name, s);

    /** @type {Map<string,string>} */
    const aliases = new Map();

    for(let t of expression.from){
        if(t.length > 1)
            aliases.set(t[1], t[0]);
    }

    for(let j of expression.joins){
        if(j.table.length > 1)
            aliases.set(j.table[1], j.table[0]);
    }

    const columns = [];
    for(let col of expression.columns){
        if(col.length === 1 && col[0].includes('*') && !col[0].includes(`'`)){
            const arr = col[0].split('.');
            if(arr.length > 1){
                const table = aliases.has(arr[0]) ? aliases.get(arr[0]) : arr[0];
                if(!smap.has(table))
                    throw new Error(`Invalid query: table '${table}' was not found.`);
                
                for(let c of smap.get(table).columns)
                    columns.push([`${arr[0]}.${c.name}`]);
            }
            else
                throw new Error('Not implemented'); //TODO: handle unprefixed wildcards
        }
        else
            columns.push(col);
    }

    //TODO: handle CTEs

    /** @type {expression} */
    const exp = JSON.parse(JSON.stringify(expression)); //deep copy
    exp.columns = columns;
    
    return exp;
}
