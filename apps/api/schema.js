import YAML from 'yaml';
import fs from 'fs/promises'
import path from 'path';
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

const Bucket = () => {
  let _source = {};
  let _collection;
  let _single;
  let _filters = [];
  function select({ collection, single }) {
    // TODO: Check if directories are readable
    if(collection == undefined && single == undefined) throw new Error('Collection and single are not defined, one of them must be selected.');
    _collection = collection;
    _single = single;
    return this;
  }
  function filter({ filters }) {
    if(filters !== undefined) {
      _filters = Object.entries(filters);
    }
    return this;
  }
  function load({ source }) {
    // TODO: Check if directories are readable
    if(source == undefined) throw new Error('Source is not defined');
    _source = source;
    return this;
  }
  const fetch = async () => {
    if(_collection !== undefined) return _fetchCollection();
    if(_single !== undefined) return _fetchSingle();
    throw new Error('Select failed.');
  }
  const _fetchCollection = async() => {
    if(_source.isFiltered || _filters === undefined) return (await _source.list({ collection: _collection }));
    const filteredList = (await _source.list({ collection: _collection })).filter(item => {
      return _filters.every(([field, criteria]) => {
        const [ condition ] = Object.keys(criteria);
        const [ value ] = Object.values(criteria);
        // TODO: Can be moved to a comparison module
        switch(condition) {
          case 'eq': 
            return item[field] == value;
            break;
          case 'neq': 
            return item[field] != value;
            break;
          case 'null': 
            return item[field] === null || item[field] === undefined || item[field].length === 0;
            break;
          case 'nnull': 
            return item[field] !== null && item[field] !== undefined && item[field].length !== 0;
            break;
          case 'gte': 
            return +item[field] >= +value;
            break;
          case 'lte': 
            return +item[field] <= +value;
            break;
          case 'gt': 
            return +item[field] > +value;
            break;
          case 'lt': 
            return +item[field] < +value;
            break;
          default:
            return false;
        }
      });
    });
    return filteredList;
  }
  const _fetchSingle = async() => {
    return (await _source.get({ filename: _single }));
  }
  return {
    select,
    filter,
    load,
    fetch,
  }
}

const Source = () => {
  const FileSystem = ({ bucketPath }) => {
    const _defaultFileExtension = 'md';
    const _root = bucketPath || './';
    const list = async ({ collection }) => {
      try {
        const filenames = await fs.readdir(path.join(_root, 'collections', collection));
        const filteredFiles = filenames.filter(filename => filename.split('.')[1] === _defaultFileExtension);
        const filePromises = filteredFiles.map(async (filename) => {
          try {
            const frontmatter = await _extractFrontMatter({ collection, filename });
            return {
              ...YAML.parse(frontmatter)
            }
          } catch (e) {
            console.error(e);
            return {};
          }
        });
        return await Promise.all(filePromises);
      } catch (e) {
          console.error(e);
        return [];
      }
    }
    const get = async({ filename }) => {
      try {
        const frontmatter = await _extractFrontMatter({ filename: filename + '.md' });
        return {
          ...YAML.parse(frontmatter)
        }
      } catch (e) {
        console.error(e);
        return {};
      }
    }
    const _extractFrontMatter = async ({ collection, filename }) => {
      let file;
      if(collection !== undefined) {
        file = await fs.readFile(path.join(_root, 'collections', collection, filename), 'utf-8');
      }
      if(collection === undefined) {
        file = await fs.readFile(path.join(_root, 'singles', filename), 'utf-8');
      }
      if(file === undefined) {
        throw new Error('Failed to get file contents or types got mixed up.');
      }
      // via and thanks to: https://github.com/jxson/front-matter/blob/master/index.js
      const pattern = '^(' +
        '\\ufeff?' +
        '(= yaml =|---)' +
        '$([\\s\\S]*?)' +
        '^(?:\\2|\\.\\.\\.)\\s*' +
        '$' +
        '(?:\\n)?)'
      const regex = new RegExp(pattern, 'm');
      const [ match ] = regex.exec(file);
      if(match == undefined) throw new Error('Can not extract frontmatter, file may be formatted incorrectly.');
      return match.replaceAll('---', '');
    }
    return {
      isFiltered: false,
      list,
      get,
    }
  }
  return { FileSystem }
}

const Resolvers = () => {
  const iterables = ['collection'];
  const filterables = ['collection'];
  const bucket = Bucket().load({
    source: Source().FileSystem({ bucketPath: '../../samples/bucket' })
  });
  const collection = async (collection, { filters }) => {
    return bucket
      .select({ collection })
      .filter({ filters })
      .fetch({ limit: 5, offset: 1 });
  }
  const single = async (single) => {
    return bucket
      .select({ single })
      .fetch();
  }
  return { 
    collection,
    single,
    iterables,
    filterables,
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
    lt: { type: GraphQLInt },
    gt: { type: GraphQLInt },
  },
  bool: {
    eq: { type: GraphQLBoolean },
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
const transform = ({ node, resolver, resolveBy }) => {
  // TODO: check if resolve by is a valid method
  let nodeObj = {};
  const name = Object.keys(node)[0];
  nodeObj[name] = {
    resolve: async (_, params) => await Resolvers()[resolveBy](name, params)
  }
  if(Resolvers().filterables.includes(resolveBy)) {
    nodeObj[name]['args'] = {
      ...mapFilterArgs(name, node)
    }
  }
  if(Resolvers().iterables.includes(resolveBy)) {
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

const config = YAML.parse(
  await fs.readFile('../../samples/schema.yml', 'utf8')
);

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Collections',
    fields: () => {
      const fields = {};
      config.collections.map(node => transform({ node, resolver: Resolvers(), resolveBy: 'collection' })).forEach(field => {
        fields[Object.keys(field)[0]] = field[Object.keys(field)[0]];
      });
      config.singles.map(node => transform({ node, resolver: Resolvers(), resolveBy: 'single' })).forEach(field => {
        fields[Object.keys(field)[0]] = field[Object.keys(field)[0]];
      });
      return fields;
    }
  }),
});

export { schema }