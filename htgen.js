/**
 * @typedef HierarchicalTree
 * @property {string[]} nodes
 * @property {HierarchicalTree[]} children
 */

/**
 * @param {import('./lexparser').ParsedSelectExpression} expression 
 * @param {import('./tsfetch').TableSchema[]} schemas 
 * @returns {HierarchicalTree}
 */
module.exports = function hierarchicalTreeGenerator(expression, schemas){
    /** @type {Map<string, import('./tsfetch').TableSchema>} */
    const smap = new Map();
    for(let s of schemas)
        smap.set(s.name, s);

    let tree = { nodes: [ arrayLast(expression.from[0]) ], children: [] };

    /** @type {Map<string,string>} */
    const aliases = new Map();
    
    for(let t of expression.from){
        if(t.length > 1)
            aliases.set(t[1], t[0]);
    }

    for(let j of expression.joins){
        if(j.table.length > 1)
            aliases.set(j.table[1], j.table[0]);

        const self = arrayLast(j.table);
        const node = { nodes: [ self ], children: [] };

        //analyze the conditions to find out which tables are involved in the join
        let other_table = null;
        const columns_involved = [];
        {
            let other_table_height = null;
            for(let c of j.condition){
                //TODO:
                // add support for non-qualified names (ie. will need the schema for all
                // involved tables in order to identify to which table each field belongs to)

                if(!c.includes('.'))
                    continue;

                const c_split = c.split('.')
                const [ t, col ] = c_split;

                columns_involved.push({ table: t, column: col });

                if(t !== self){
                    const h = height(tree, t);
                    if(h == null)
                        continue;

                    if(other_table == null || h > other_table_height){
                        other_table = t;
                        other_table_height = h;
                    }
                }
            }
        }

        if(other_table == null)
            throw new Error(`Invalid join. Unable to parse the 'ON' clause`);

        const other_table_node = findNode(tree, other_table);

        // checks whether self and other_table have a 1 -> 1 or 1 -> N relationship
        // algorithm: all involved columns must be unique for it to be a 1 -> 1 relationship
        const one_to_one = !columns_involved.find(x => !smap.get(aliases.get(x.table)).columns.find(y => y.name === x.column).unique);

        if(one_to_one){
            other_table_node.nodes.push(...node.nodes);
            other_table_node.children.push(...node.children);
        }
        else {
            //if other_table contains a column involved in the join which isn't unique, then other_way_around is true
            const other_way_around = columns_involved.filter(x => x.table === other_table).find(x => !smap.get(aliases.get(x.table)).columns.find(y => y.name === x.column).unique);

            if(other_way_around) {
                node.children.push(other_table_node);
                tree = replaceNode(tree, other_table_node, node);
            }
            else
                other_table_node.children.push(node);
        }
    }

    //TODO: handle CTEs
    return tree;
}

function arrayLast(arr){
    return arr[arr.length - 1];
}

function height(tree, node){
    if(tree.nodes.includes(node))
        return 0;
    for(let c of tree.children){
        const h = height(c, node);
        if(h != null)
            return 1 + h;
    }
    return null;
}

function findNode(tree, name){
    if(tree.nodes.includes(name))
        return tree;
    for(let c of tree.children){
        const node = findNode(c, name);
        if(node != null)
            return node;
    }
    return null;
}

function replaceNode(tree, oldNode, newNode){
    if(tree === oldNode)
        return newNode;
    for(let i = 0; i < tree.children.length; i++)
        tree.children[i] = replaceNode(tree.children[i], oldNode, newNode);
    return tree;
}