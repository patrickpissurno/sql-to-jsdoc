/**
 * @param {import('./tinferrer').ColumnType[]} columns
 * @returns {any} intermediary representation
 */
module.exports = function intermediaryRepresentationGenerator(columns){
    const result = {};
    for(let column of columns)
        result[column.name] = column.type;
    return result;
}
