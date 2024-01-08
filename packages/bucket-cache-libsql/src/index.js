import Database from 'libsql';

export const Cache = () => {
  const db = new Database(':memory:');
  const _createCacheTables = () => {
    db.exec(`CREATE TABLE collections (id INTEGER PRIMARY KEY, collection_type TEXT, collection_id TEXT, collection_body TEXT)`);
    db.exec(`CREATE TABLE collections_props (id INTEGER PRIMARY KEY, collection_id INTEGER, prop_name TEXT, prop_value JSON)`);
  }
  const populate = ({ collection, single, data }) => {
    data.map(async item => {
      // TODO: Must expire cache automatically
      const row = db.prepare(`INSERT INTO collections (collection_type, collection_id) VALUES (?, ?)`).run([collection,item.id]);
      const statement = db.prepare(`INSERT INTO collections_props (collection_id, prop_name, prop_value) VALUES (?, ?, ?)`);
      Object.keys(item)
        .map(async (prop) => {
          if (typeof item[prop] === 'function' && item[prop].constructor.name === 'AsyncFunction') {
            statement.run([row.lastInsertRowid, prop, JSON.stringify(await item[prop]())]);
          }
          else {
            statement.run([row.lastInsertRowid, prop, JSON.stringify(item[prop])]);
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
      // TODO: Should optimize queries, merge into single query.
      const props = db.prepare(`SELECT prop_name, prop_value FROM collections_props WHERE collection_id = ?`).all(collection.id);
      props.map(prop => data[prop.prop_name] = JSON.parse(prop.prop_value));
      list.push(data);
    });
    return list;
  }
  const isCached = ({ entityType }) => {
    const numOfRows = db.prepare(`SELECT COUNT(1) as count FROM collections WHERE collection_type = ?`).get(entityType);
    return numOfRows?.count == 0;
  }
  _createCacheTables();
  return {
    populate,
    get,
    isCached,
  }
}