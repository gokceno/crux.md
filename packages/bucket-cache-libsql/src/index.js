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
  const get = ({ collection, filters, order, limit = -1, offset = 0 }) => {
    // TODO: on first search (when gathered from MD files) null values are displayed, even though they're filtered
    // TODO: Bool filtering doesn't work because of quotes.
    // TODO: Date's in WHERE's
    // TODO: Should optimize queries, merge into single query.
    // TODO: How to run the complex sort's? -- dates.
    let list = [];
    const collections = db
      .prepare(`
        SELECT c.* FROM collections c 
        INNER JOIN collections_props cp ON c.id = cp.collection_id 
        WHERE 
          ${filters.filter(f => Object.keys(f)[0] !== '_eq' && f[1]._eq !== undefined).map(f => `(cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') = '${f[1]._eq}') AND`).join(' ')}
          ${filters.filter(f => Object.keys(f)[0] !== '_neq' && f[1]._neq !== undefined).map(f => `(cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') != '${f[1]._neq}') AND`).join(' ')}
          ${filters.filter(f => Object.keys(f)[0] !== '_null' && f[1]._null !== undefined).map(f => `(cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') = '') AND`).join(' ')}
          ${filters.filter(f => Object.keys(f)[0] !== '_nnull' && f[1]._nnull !== undefined).map(f => `(cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') != '') AND`).join(' ')}
          ${filters.filter(f => Object.keys(f)[0] !== '_gt' && f[1]._gt !== undefined).map(f => `(cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') > '${f[1]._gt}') AND`).join(' ')}
          ${filters.filter(f => Object.keys(f)[0] !== '_gte' && f[1]._gte !== undefined).map(f => `(cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') >= '${f[1]._gte}') AND`).join(' ')}
          ${filters.filter(f => Object.keys(f)[0] !== '_lt' && f[1]._lt !== undefined).map(f => `(cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') > '${f[1]._lt}') AND`).join(' ')}
          ${filters.filter(f => Object.keys(f)[0] !== '_lte' && f[1]._lte !== undefined).map(f => `(cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') >= '${f[1]._lte}') AND`).join(' ')}
          c.collection_type = ? 
        GROUP BY c.id 
        ORDER BY 
          ${order.map(o => `MAX(CASE WHEN cp.prop_name = '${o[0]}' THEN cp.prop_value ELSE NULL END) ${o[1]},`).join(' ')}
          MAX(cp.prop_value) ASC
        LIMIT ? OFFSET ?
      `)
      .all([collection, limit, offset]);
    collections.map(collection => {
      let data = {};
      data.id = collection.collection_id;
      const props = db.prepare(`SELECT prop_name, prop_value FROM collections_props WHERE collection_id = ?`).all(collection.id);
      props.map(prop => data[prop.prop_name] = JSON.parse(prop.prop_value));
      list.push(data);
    });
    return list;
  }
  const isCached = ({ entityType }) => {
    const numOfRows = db.prepare(`SELECT COUNT(1) as count FROM collections WHERE collection_type = ?`).get(entityType);
    return numOfRows?.count !== 0;
  }
  _createCacheTables();
  return {
    populate,
    get,
    isCached,
  }
}