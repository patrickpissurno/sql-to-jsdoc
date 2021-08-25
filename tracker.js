const NUMBERS = new Set(['0','1','2','3','4','5','6','7','8','9']);

/**
 * @param {import('./lexparser').ParsedSelectExpression} expression 
 * @param {import('./tsfetch').TableSchema[]} schemas 
 */
module.exports = function columnTracker(expression, schemas){
    /** @type {Map<string, import('./tsfetch').TableSchema>} */
    const smap = new Map();
    for(let s of schemas)
        smap.set(s.name, s);

    /** @type {Map<string,string>} */
    const aliases = new Map();

    /** @type {Set<string>} */
    const all_tables = new Set();

    for(let t of expression.from){
        if(t.length > 1)
            aliases.set(t[1], t[0]);
        all_tables.add(t[t.length - 1]);
    }

    for(let j of expression.joins){
        if(j.table.length > 1)
            aliases.set(j.table[1], j.table[0]);
        all_tables.add(j.table[j.table.length - 1]);
    }

    /** @type {Set<string>} */
    const conflicting_columns = new Set();

    /** @type { Map<string, string> } */
    const all_columns = new Map();

    for(let t of all_tables){
        const table = aliases.has(t) ? aliases.get(t) : t;
        for(let c of smap.get(table).columns){
            if(conflicting_columns.has(c.name) || all_columns.has(c.name)){
                all_columns.delete(c.name);
                conflicting_columns.add(c.name);
            }
            else
                all_columns.set(c.name, t);
        }
    }

    //TODO: handle functions (eg. AVG)

    const result = [];

    for(let col of expression.columns){
        if(col[0].includes(`'`) || NUMBERS.has(col[0][0])){
            result.push(null);
        }
        else {
            const arr = col[0].split('.');
            if(arr.length > 1){
                const [ t, c ] = arr;
                const table = aliases.has(t) ? aliases.get(t) : t;
                if(smap.has(table))
                    result.push(smap.get(table).name);
                else
                    result.push(null); //TODO: check
            }
            else {
                const c = unquoteString(arr[0]);
                if(conflicting_columns.has(c)){
                    throw new Error(`Error: column name '${c}' is ambiguous`);
                }
                else if(all_columns.has(c)){
                    const t = all_columns.get(c);
                    result.push(smap.get(aliases.has(t) ? aliases.get(t) : t).name);
                }
                else
                    result.push(null); //TODO: check
            }
        }
    }

    return result;
}

/**
 * Remove quotes from the beginning and the end of a given string
 * @param {string} str 
 * @param {string} quote 
 */
function unquoteString(str, quote = '"'){
    if(str[0] === quote && str[str.length - 1] === quote)
        return str.substr(1, str.length - 2);
    return str;
}