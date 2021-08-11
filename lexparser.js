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
                case undefined:
                    const token = sql.substring(startIndex, i);
                    if(token.trim())
                        tokens.push(token);

                    startIndex = i;
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

    if(expression.type == null)
        throw new Error('Unsuported expression type');

    //TODO: continue
    
    return expression;
}