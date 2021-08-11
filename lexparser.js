/**
 * Parses the sql string into an intermediate form
 * @param {string} sql 
 */
module.exports = function lexparser(sql){
    const tokens = lexer(sql);
    console.log(tokens);
    const parsed = parser(tokens);
    console.log(parsed);
}

/** @param {string} sql */
function lexer(sql){
    sql = sql.trim();

    /** @type {string[]} */
    const tokens = [];

    let inside_string = null;

    let startIndex = 0;
    for(let i = 1; i <= sql.length; i++){
        if(!inside_string){
            switch(sql[i]){
                case ' ':
                case '\n':
                case ',':
                case '(':
                case ')':
                case undefined:
                    const token = sql.substring(startIndex, i);
                    if(token.trim())
                        tokens.push(token);

                    startIndex = i;

                    if(sql[i] != null && sql[i] !== ' ' && sql[i] !== '\n'){
                        tokens.push(sql[i]);
                        startIndex += 1;
                    }
                    break;
                case '\'':
                    inside_string = '\'';
                    break;
                case '"':
                    inside_string = '"';
                    break;
            }
            if(sql[i] === ' ' || sql[i] === '\n')
                startIndex += 1;
        }
        else if(sql[i] === inside_string){
            const token = sql.substring(startIndex, i + 1);
            tokens.push(token);

            startIndex = i + 1;
            inside_string = null;
        }
    }

    return tokens;
}

/** @param {string[]} tokens */
function parser(tokens){
    if(tokens.length < 1)
        throw new Error('Invalid query');

    const expression = { type: null };

    // find expression type
    let main_query_start = 0;
    if(tokens[0] === 'WITH'){
        let open_parenthesis = 0;
        let expected = 'alias';
        let end = null;
        for(let i = 1; i < tokens.length && end == null; i++){
            switch(expected){
                case 'alias':
                    expected = 'AS';
                    continue;
                case 'AS':
                    if(tokens[i] !== 'AS')
                        throw new Error(`Unexpected token '${tokens[i]}'. Expecting: '${expected}'.`);
                    expected = '(';
                    continue;
                case '(':
                    if(tokens[i] !== '(')
                        throw new Error(`Unexpected token '${tokens[i]}'. Expecting: '${expected}'.`);
                    open_parenthesis = 1;
                    expected = ')';
                    continue;
                case ')':
                    if(tokens[i] === '(')
                        open_parenthesis += 1;
                    else if(tokens[i] === ')')
                        open_parenthesis -= 1;

                    if(open_parenthesis === 0)
                        expected = ',';
                    continue;
                case ',':
                    if(tokens[i] === ','){
                        expected = 'alias';
                        continue;
                    }
                    else
                        end = i;
                    break;
            }
        }

        if(end == null)
            throw new Error('Invalid query');
        main_query_start = end;
    }
    switch(tokens[main_query_start]){
        case 'SELECT':
            expression.type = tokens[main_query_start];
            break;
    }

    switch(expression.type){
        case 'SELECT':
            Object.assign(expression, parseSelect(tokens, main_query_start));
            break;
        default:
            throw new Error('Unsuported expression type');
    }
    
    return expression;
}

// https://www.postgresql.org/docs/current/sql-select.html
const POSSIBLE_KEYWORDS_IMMEDIATELY_AFTER_SELECT = new Set([
    'ALL',
    'DISTINCT',
]);

//https://www.postgresql.org/docs/current/queries-table-expressions.html
const POSSIBLE_KEYWORDS_JOIN_MODIFIERS = new Set([
    'CROSS',
    'INNER',
    'LEFT',
    'RIGHT',
    'FULL',
    'OUTER',
    'NATURAL',
]);

// https://www.postgresql.org/docs/current/sql-select.html
const POSSIBLE_KEYWORDS_AFTER_FROM_TABLE_NAME = new Set([
    'WHERE',
    'GROUP',
    'HAVING',
    'WINDOW',
    'UNION',
    'INTERSECT',
    'EXCEPT',
    'ORDER',
    'LIMIT',
    'OFFSET',
    'FETCH',
    'FOR',

    ...POSSIBLE_KEYWORDS_JOIN_MODIFIERS,
    'JOIN',
]);

/**
 * @param {string[]} tokens
 * @param {number} query_start
*/
function parseSelect(tokens, query_start){
    let columns = [];
    let from = [];
    let joins = [];
    
    let startIndex = query_start + 1;
    let immediately_after_select = true;
    for(let i = startIndex; i < tokens.length; i++){
        if(immediately_after_select){
            if(!POSSIBLE_KEYWORDS_IMMEDIATELY_AFTER_SELECT.has(tokens[i])){
                immediately_after_select = false;
                startIndex = i;
                i -= 1;
            }
        }
        else if(tokens[i] === ',' || tokens[i] === 'FROM'){
            const col = [];
            for(let j = startIndex; j < i; j++)
                col.push(tokens[j]);
            columns.push(col);
            startIndex = i + 1;

            if(tokens[i] === 'FROM')
                break;
        }
    }

    let expected = 'table';
    let end = null;
    for(let i = startIndex; i < tokens.length; i++){
        switch(expected){
            case 'table':
                from.push([ tokens[i] ]);
                expected = 'alias';
                continue;
            case 'alias':
                if(POSSIBLE_KEYWORDS_AFTER_FROM_TABLE_NAME.has(tokens[i])){
                    end = i;
                    break;
                }
                else if(tokens[i] === ','){
                    expected = ',';
                    i -= 1;
                    continue;
                }
                else if(tokens[i] === 'AS'){
                    continue;
                }
                else {
                    from[from.length - 1].push(tokens[i]);
                    expected = ',';
                    continue;
                }
            case ',':
                if(tokens[i] === ','){
                    expected = 'table';
                    continue;
                }
                else
                    end = i;
                break;
        }
        if(end != null)
            break;
    }

    startIndex = end == null ? tokens.length : end;

    // find first join
    let found_join = false;
    for(let i = startIndex; i < tokens.length; i++){
        if(tokens[i] == 'JOIN'){
            startIndex = i;
            found_join = true;
            break;
        }
    }

    //find join starting token
    if(found_join){
        for(let i = startIndex - 1; i >= end; i--){
            if(POSSIBLE_KEYWORDS_JOIN_MODIFIERS.has(tokens[i]))
                startIndex = i;
            else
                break;
        }

        joins.push({ modifiers: [], table: [] });

        let expected = 'modifier';
        for(let i = startIndex; i < tokens.length; i++){
            if(expected === 'modifier'){
                if(tokens[i] === 'JOIN')
                    expected = 'table';
                else if(POSSIBLE_KEYWORDS_JOIN_MODIFIERS.has(tokens[i]))
                    joins[joins.length - 1].modifiers.push(tokens[i]);
                else
                    throw new Error(`Unexpected token '${tokens[i]}'. Expecting: ${[...POSSIBLE_KEYWORDS_JOIN_MODIFIERS, 'JOIN'].map(x => `'${x}'`).join(', ')}.`);
            }
            else {
                switch(expected){
                    case 'table':
                        if(tokens[i] === 'AS')
                            continue;
                        else if(tokens[i] === 'ON')
                            expected = 'condition';
                        else
                            joins[joins.length - 1].table.push(tokens[i]);
                        continue;
                }
            }
        }
    }

    return { type: 'SELECT', columns, from, joins };
}