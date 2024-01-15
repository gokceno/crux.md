import { 
  GraphQLSchema, 
  GraphQLObjectType, 
  GraphQLString, 
  GraphQLList, 
  GraphQLInt, 
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLEnumType, 
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
const mapGraphQLTypes = (type, leaf) => {
  let mappedType = {};
  if(['string', 'date', 'body'].includes(type)) {
    mappedType = {
      type: GraphQLString
    }
  }
  else if(['int', 'integer'].includes(type)) {
    mappedType = {
      type: GraphQLInt
    }
  }
  else if(['bool', 'boolean'].includes(type)) {
    mappedType = {
      type: GraphQLBoolean
    }
  }
  else if(Array.isArray(type) && (type.length == 0 || ['string', 'number'].includes(typeof type[0]))) {
    // TODO: Can create different types for string array and int array
    mappedType = {
      type: new GraphQLList(
        GraphQLString
      )
    }
  }
  else if(Array.isArray(type) && type.length > 0 && typeof type[0] == 'object') {
    mappedType = {
      type: new GraphQLList(
        new GraphQLObjectType({
          name: Object.keys(leaf)[0] + '_' + Math.random().toString(36).slice(2, 6),
          fields: mapFields(leaf),
        })
      )
    }
  }
  else {
    throw new Error('Input type cannot be mapped to a GraphQL type.');
  }
  return mappedType;
}
const mapFields = (node, nodes, depth = 0) => {
  let leafObj = {};
  Object.values(node)[0].push({ body: 'string' });
  Object.values(node)[0].map(leaf => {
    Object.entries(leaf).map(([name, type]) => {
      if(type.includes('/')) {
        if(depth < 1 && nodes !== undefined) {
          const [targetNodeName, targetNodeVia] = type.split('/');
          const targetNode = nodes.filter(leaf => Object.keys(leaf)[0] == targetNodeName);
          leafObj[name] = {
            type: new GraphQLList(
              new GraphQLObjectType({
                name: Object.keys(targetNode[0])[0] + '_' + Math.random().toString(36).slice(2, 6),
                fields: () => mapFields(targetNode[0], nodes, depth + 1),
              })
            )
          }
        }
      }
      else {
        leafObj[name] = mapGraphQLTypes(type, leaf);
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
        fields: mapFields(node, nodes),
      })
    );
  }
  else {
    nodeObj[name]['type'] = new GraphQLObjectType({
      name,
      fields: mapFields(node, nodes),
    });
  }
  return nodeObj;
}