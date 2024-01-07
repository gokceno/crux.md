import Database from 'libsql';
import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { Bucket } from '@crux/bucket';
import { FileSystem } from '@crux/bucket-source-filesystem';
import { Resolvers } from '@crux/graphql-api-resolvers';
import { transform } from '@crux/graphql-api';



const cache = () => {
  const db = new Database(':memory:');
  const _createCacheTables = () => {
    db.exec(`CREATE TABLE collections (id INTEGER PRIMARY KEY, collection_type TEXT, collection_id TEXT, collection_body TEXT)`);
    db.exec(`CREATE TABLE collections_props (id INTEGER PRIMARY KEY, collection_id INTEGER, prop_name TEXT, prop_value JSON)`);
  }
  const populate = ({ collection, single, data }) => {
    data.map(item => {
      // TODO: Body set'lenmiyor
      // TODO: Statement escape
      // TODO: Must save hash
      // TODO: Relation'lar çözülmediği için insert'lenmiyor.
      const row = db.prepare(`INSERT INTO collections (collection_type, collection_id, collection_body) VALUES ('${collection}', '${item.id}', '')`).run();
      Object.keys(item).map(async (prop) => {
        if(!['id', 'body'].includes(prop)) {
          db.exec(`INSERT INTO collections_props (collection_id, prop_name, prop_value) VALUES (${row.lastInsertRowid}, '${prop}', '${JSON.stringify(item[prop])}')`);
        }
      });
    });
    return data;
  }
  const get = () => {
    // TODO: Collection sort, filter vb. eksik
    let list = [];
    const collections = db.prepare(`SELECT id, collection_id FROM collections`).all();
    collections.map(collection => {
      let data = {};
      data.id = collection.collection_id;
      const props = db.prepare(`SELECT prop_name, prop_value FROM collections_props WHERE collection_id = ${collection.id}`).all();
      props.map(prop => {
        if(prop.prop_name !== 'related_movies') data[prop.prop_name] = JSON.parse(prop.prop_value); // TODO: Temp fix for undefined error.
      })
      list.push(data);
    });
    return list;
  }
  const isCached = ({ entityType }) => {
    const numOfRows = db.prepare(`SELECT COUNT(1) as count FROM collections WHERE collection_type = '${entityType}'`).get();
    return numOfRows?.count == 0;
  }
  const invalidate = () => {}

  _createCacheTables();
  
  return {
    populate,
    get,
    isCached,
    invalidate,
  }
}


const bucket = Bucket({ _cacheAdapter: cache() }).load({
  source: FileSystem({ bucketPath: '../../samples/bucket' }),
});

const manifest = await bucket.manifest();

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: () => {
      const fields = {};
      manifest.collections.map(node => transform({ nodes: manifest.collections, node, resolver: Resolvers({ bucket }), resolveBy: 'collection' })).forEach(field => {
        fields[Object.keys(field)[0]] = field[Object.keys(field)[0]];
      });
      manifest.singles.map(node => transform({ nodes: manifest.collections, node, resolver: Resolvers({ bucket }), resolveBy: 'single' })).forEach(field => {
        fields[Object.keys(field)[0]] = field[Object.keys(field)[0]];
      });
      return fields;
    }
  }),
});

export { schema }