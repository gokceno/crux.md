import { 
  GraphQLSchema, 
  GraphQLObjectType, 
  GraphQLString, 
  GraphQLNonNull, 
  GraphQLList, 
  GraphQLInt, 
  GraphQLBoolean,
  GraphQLInputObjectType 
} from 'graphql';


const d = {
  "collections": [
    {
      "products": [
        { "id": "int" },
        { "parent": "string" },
        {
          "campaigns": [
            { 
              "is_active": "bool",
              "name": "string",
            }
          ]
        } 
      ]
    },
    {
      "news": [
        { "id": "int" },
        { "tags": [] }, 
      ]
    }
  ],
};

const Bucket = () => {
  let _source = {};
  function select() {
    return this;
  }
  function filter() {
    return this;
  }
  function load({ source }) {
    if(source == undefined) throw new Error('Source is not defined');
    _source = source;
    return this;
  }
  const get = () => {}
  const fetch = () => {
    return _source.list();
  }
  return {
    select,
    filter,
    load,
    get,
    fetch,
  }
}

const Source = () => {
  const FileSystem = () => {
    const list = () => {
      return [{}, {}];
    }
    return { list }
  }
  return { FileSystem }
}


const Resolvers = () => {
  const collection = (collection, { filters }) => {
    const bucket = Bucket().load({
      source: Source().FileSystem({ path: '../files' })
    });
    return bucket
      .select({ collection })
      .fetch({ limit: 5, offset: 1 });
  }
  return { 
    collection,
  }
}

const mappings = {
  string: {
    eq: { type: GraphQLString },
    neq: { type: GraphQLString },
    null: { type: GraphQLBoolean },
    nnull: { type: GraphQLBoolean },
  },
  int: {
    eq: { type: GraphQLInt },
    neq: { type: GraphQLInt },
    lte: { type: GraphQLInt },
    gte: { type: GraphQLInt },
  }
};
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
  // TODO: Must display filter criteria based on data types
  let leafObj = {};
  Object.values(node)[0].map(leaf => {
    Object.entries(leaf).map(([name, type]) => {
      if(['string', 'int'].includes(type)) {
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
const transform = (node) => {
  let nodeObj = {};
  const name = Object.keys(node)[0];
  nodeObj[name] = {
    args: {
      ...mapFilterArgs(name, node)
    },
    type: new GraphQLList(
      new GraphQLObjectType({
        name,
        fields: mapFields(node),
      })
    ),
    resolve: (_, params) => Resolvers().collection(name, params),
  }
  return nodeObj;
}

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Collections',
    fields: () => {
      const fields = {};
      d.collections.map(item => transform(item)).forEach(field => {
        fields[Object.keys(field)[0]] = field[Object.keys(field)[0]];
      });
      return fields;
    }
  }),
});

export { schema }