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
  bool: {
    _eq: { type: GraphQLBoolean },
  }
}
const mapGraphQLTypes = (type, leaf) => {
  let mappedType = {};
  if(['string'].includes(type)) {
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
          name: Object.keys(leaf)[0],
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
const mapFields = (node) => {
  let leafObj = {};
  Object.values(node)[0].map(leaf => {
    Object.entries(leaf).map(([name, type]) => {
      leafObj[name] = mapGraphQLTypes(type, leaf);
    });
    return leafObj;
  });
  return leafObj;
}
const mapFilterArgs = (collectionName, node) => {
  let leafObj = {};
  Object.values(node)[0].map(leaf => {
    Object.entries(leaf).map(([name, type]) => {
      if(['string', 'int', 'bool'].includes(type)) {
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
const mapLimitArgs = () => {

}
const mapOrderArgs = (collectionName, node) => {
  let leafObj = {};
  Object.values(node)[0].map(leaf => {
    Object.entries(leaf).map(([name, type]) => {
      if(['string', 'int'].includes(type)) {
        leafObj[name] = { 
          type: new GraphQLEnumType({
            name: `order_${collectionName}_${name}`,
            values: {
              ASC: { value: '_asc' },
              DESC: { value: '_desc' },
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
export const transform = ({ node, resolver, resolveBy }) => {
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
    }
  }
  if(resolver.iterables.includes(resolveBy)) {
    nodeObj[name]['type'] = new GraphQLList(
      new GraphQLObjectType({
        name,
        fields: mapFields(node),
      })
    );
  }
  else {
    nodeObj[name]['type'] = new GraphQLObjectType({
      name,
      fields: mapFields(node),
    });
  }
  return nodeObj;
}