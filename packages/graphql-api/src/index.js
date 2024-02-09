import { 
  GraphQLSchema, 
  GraphQLObjectType, 
  GraphQLString, 
  GraphQLList, 
  GraphQLInt, 
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLNonNull,
} from 'graphql';

const mappings = {
  string: {
    _eq: { type: GraphQLString },
    _neq: { type: GraphQLString },
    _null: { type: GraphQLBoolean },
    _nnull: { type: GraphQLBoolean },
  },
  int: {
    _eq: { type: GraphQLInt },
    _neq: { type: GraphQLInt },
    _lte: { type: GraphQLInt },
    _gte: { type: GraphQLInt },
    _lt: { type: GraphQLInt },
    _gt: { type: GraphQLInt },
  },
  date: {
    _eq: { type: GraphQLString },
    _neq: { type: GraphQLString },
    _lte: { type: GraphQLString },
    _gte: { type: GraphQLString },
    _lt: { type: GraphQLString },
    _gt: { type: GraphQLString },
  },
  bool: {
    _eq: { type: GraphQLBoolean },
  }
}
const mapGraphQLTypes = (type, leaf, nodes, depth = 0, prefix) => {
  let mappedType = {};
  if(['string', 'string!', 'date', 'date!', 'body', 'body!'].includes(type)) {
    mappedType = {
      type: type.endsWith('!') ? new GraphQLNonNull(GraphQLString) : GraphQLString
    }
  }
  else if(['int', 'integer', 'int!', 'integer!'].includes(type)) {
    mappedType = {
      type: type.endsWith('!') ? new GraphQLNonNull(GraphQLInt) : GraphQLInt
    }
  }
  else if(['bool', 'boolean', 'bool!', 'boolean!'].includes(type)) {
    mappedType = {
      type: type.endsWith('!') ? new GraphQLNonNull(GraphQLBoolean) : GraphQLBoolean
    }
  }
  else if(typeof type === 'object' && Array.isArray(type) && (type.length == 0 || ['string', 'number'].includes(typeof type[0]))) {
    // TODO: Can create different types for string array and int array
    // TODO: Cannot define non-nullable for arrays
    mappedType = {
      type: new GraphQLList(
        GraphQLString
      )
    }
  }
  else if(typeof type === 'object' && Array.isArray(type) && type.length > 0 && typeof type[0] === 'object') {
    mappedType = {
      type: new GraphQLList(
        new GraphQLObjectType({
          name: [prefix, Object.keys(leaf)[0]].join('_'),
          fields: mapFields(leaf, nodes, depth, [prefix, Object.keys(leaf)[0]].join('_')),
        })
      )
    }
  }
  else if(typeof type === 'object' && !Array.isArray(type)) {
    mappedType = {
      type: new GraphQLObjectType({
        name: [prefix, Object.keys(leaf)[0]].join('_'),
        fields: mapField(Object.values(leaf)[0], nodes),
      })
    }
  }
  else if(typeof type === 'string' && type.includes('/')) {
    const [targetNodeName, targetNodeVia] = type.split('/');
    const targetNode = nodes.filter(leaf => Object.keys(leaf)[0] == targetNodeName);
    if (targetNode === undefined) throw new Error('Target node cannot be mapped to a GraphQL type.');
    mappedType = {
      type: new GraphQLList(
        new GraphQLObjectType({
          name: [prefix, Object.keys(leaf)[0]].join('_'),
          fields: () => mapFields(targetNode[0], nodes, depth + 1, [prefix, targetNodeName].join('_')),
        })
      )
    }
  }
  else {
    throw new Error('Input type cannot be mapped to a GraphQL type.');
  }
  return mappedType;
}
const mapField = (node, nodes) => {
  let leafObj = {};
  Object.entries(node).map(([name, type]) => {
    let leafChildObj = {};
    leafChildObj[name] = type;
    leafObj[name] = mapGraphQLTypes(type, leafChildObj, nodes, 0, name); // TODO: Depth is always 0, may be a problem?
  });
  return leafObj;
}
const mapFields = (node, nodes, depth = 0, prefix) => {
  let leafObj = {};
  if (nodes !== undefined) Object.values(node)[0].push({ _body: 'string' });
  (Object.values(node)[0] ?? []).map(leaf => {
    Object.entries(leaf).map(([name, type]) => {
      if(typeof type === 'string' && type.includes('/')) {
        if(depth < 1 && nodes !== undefined) {
          const [targetNodeName, targetNodeVia] = type.split('/');
          const targetNode = nodes.filter(leaf => Object.keys(leaf)[0] == targetNodeName);
          leafObj[name] = {
            type: new GraphQLList(
              new GraphQLObjectType({
                name: [prefix, name].join('_'),
                fields: () => mapFields(targetNode[0], nodes, depth + 1, [prefix, name].join('_')),
              })
            )
          }
        }
      }
      else {
        leafObj[name] = mapGraphQLTypes(type, leaf, nodes, depth + 1, prefix);
      }
    });
  });
  return leafObj;
}
const mapFilterArgs = (collectionName, node) => {
  let leafObj = {};
  Object.values(node)[0].map(leaf => {
    Object.entries(leaf).map(([name, type]) => {
      if(['string', 'int', 'bool', 'date'].includes(type)) {
        leafObj[name] = { 
          type: new GraphQLInputObjectType({
            name: `filter_${collectionName}_${name}`, 
            fields: () => mappings[type]
          })
        };
      }
    });
    return leafObj;
  });
  if(Object.keys(leafObj).length === 0) return undefined;
  return { 
    filters: { 
      type: new GraphQLInputObjectType({
        name: `filter_${collectionName}`,
        fields: leafObj,
      }
    )
  }};
}
const mapLimitArgs = (collectionName) => {
  let leafObj = {};
  leafObj['limit'] = { 
    type: new GraphQLInputObjectType({
      name: `limit_${collectionName}`, 
      fields: {
        limit: {
          name: 'limit',
          type: GraphQLInt
        },
        offset: {
          name: 'offset',
          type: GraphQLInt
        }
      }
    })
  }
  return leafObj;
}
const mapOrderArgs = (collectionName, node) => {
  let leafObj = {};
  Object.values(node)[0].map(leaf => {
    Object.entries(leaf).map(([name, type]) => {
      if(['string', 'int', 'date'].includes(type)) {
        leafObj[name] = { 
          type: new GraphQLEnumType({
            name: `order_${collectionName}_${name}`,
            values: {
              asc: { value: 'asc' },
              desc: { value: 'desc' },
            },
          })
        }
      }
    })
    return leafObj;
  });
  if(Object.keys(leafObj).length === 0) return undefined;
  return { 
    order: { 
      type: new GraphQLInputObjectType({
        name: `order_${collectionName}`,
        fields: leafObj,
      }
    )
  }};
}
export const transform = ({ nodes, node, resolver, resolveBy }) => {
  // TODO: check if resolve by is a valid method
  let nodeObj = {};
  const name = Object.keys(node)[0];
  nodeObj[name] = {
    resolve: async (_, params) => await resolver[resolveBy](name, params)
  }
  if(resolver.filterables.includes(resolveBy)) {
    nodeObj[name]['args'] = {
      ...mapFilterArgs(name, node),
      ...mapOrderArgs(name, node),
      ...mapLimitArgs(name),
    }
  }
  if(resolver.iterables.includes(resolveBy)) {
    nodeObj[name]['type'] = new GraphQLList(
      new GraphQLObjectType({
        name,
        fields: mapFields(node, nodes, 0, name),
      })
    );
  }
  else {
    nodeObj[name]['type'] = new GraphQLObjectType({
      name,
      fields: mapFields(node, nodes, 0, name),
    });
  }
  return nodeObj;
}