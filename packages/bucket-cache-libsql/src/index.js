import Database from 'libsql';

export const Cache = ({ dbPath = ':memory:', expires, manifest }) => {
  const db = new Database(dbPath);
  const _createCacheTables = () => {
    db.exec(`CREATE TABLE collections (id INTEGER PRIMARY KEY, collection_type TEXT, collection_id TEXT, collection_body TEXT)`);
    db.exec(`CREATE TABLE collections_props (id INTEGER PRIMARY KEY, collection_id INTEGER, prop_name TEXT, prop_value JSON)`);
  }
  const _flush = () => ['collections', 'collections_props'].map(collection => db.exec(`DELETE FROM ${collection}`));
  const _reset = () => ['collections', 'collections_props'].map(collection => db.exec(`DROP TABLE IF EXISTS ${collection}`));
  const populate = ({ collection, single, data }) => {
    _flush();
    data.map(async item => {
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
    // TODO: Must expire cache automatically
    // TODO: Returns body even if limit > 1
    // TODO: on first search (when gathered from MD files) "null" values are displayed, even though they're filtered
    // TODO: Bool filtering doesn't work because of quotes.
    // TODO: Quotes in WHEREs break the query.
    // TODO: Dates in WHEREs don't work properly
    // TODO: How to run the complex sort's? -- dates.
    let list = [];
    const collections = db
      .prepare(`
        SELECT
          c.id AS collection_id, 
          GROUP_CONCAT('"' || cp.prop_name || '":' || cp.prop_value) AS properties
        FROM collections c
        LEFT JOIN collections_props cp ON c.id = cp.collection_id
        GROUP BY
          c.id
        HAVING 
          ${filters.filter(f => Object.keys(f)[0] !== '_eq' && f[1]._eq !== undefined).map(f => `MAX(CASE WHEN cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') = '${f[1]._eq}' THEN 1 ELSE 0 END) = 1 AND`).join(' ')}
          ${filters.filter(f => Object.keys(f)[0] !== '_neq' && f[1]._neq !== undefined).map(f => `MAX(CASE WHEN cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') != '${f[1]._neq}' THEN 1 ELSE 0 END) = 1 AND`).join(' ')}
          ${filters.filter(f => Object.keys(f)[0] !== '_null' && f[1]._null !== undefined).map(f => `MAX(CASE WHEN cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') = '' THEN 1 ELSE 0 END) = 1 AND`).join(' ')}
          ${filters.filter(f => Object.keys(f)[0] !== '_nnull' && f[1]._nnull !== undefined).map(f => `MAX(CASE WHEN cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') != '' THEN 1 ELSE 0 END) = 1 AND`).join(' ')}
          ${filters.filter(f => Object.keys(f)[0] !== '_gt' && f[1]._gt !== undefined).map(f => `MAX(CASE WHEN cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') > '${f[1]._gt}' THEN 1 ELSE 0 END) = 1 AND`).join(' ')}
          ${filters.filter(f => Object.keys(f)[0] !== '_gte' && f[1]._gte !== undefined).map(f => `MAX(CASE WHEN cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') >= '${f[1]._gte}' THEN 1 ELSE 0 END) = 1 AND`).join(' ')}
          ${filters.filter(f => Object.keys(f)[0] !== '_lt' && f[1]._lt !== undefined).map(f => `MAX(CASE WHEN cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') < '${f[1]._lt}' THEN 1 ELSE 0 END) = 1 AND') OR`).join(' ')}
          ${filters.filter(f => Object.keys(f)[0] !== '_lte' && f[1]._lte !== undefined).map(f => `MAX(CASE WHEN cp.prop_name = '${f[0]}' AND JSON_EXTRACT(cp.prop_value, '$') <= '${f[1]._lte}' THEN 1 ELSE 0 END) = 1 AND`).join(' ')}
          c.collection_type = ?
        ORDER BY
          ${order.map(o => `MAX(CASE WHEN cp.prop_name = '${o[0]}' THEN cp.prop_value ELSE NULL END) ${o[1]},`).join(' ')}
          MAX(cp.prop_value) ASC
        LIMIT ? OFFSET ?
      `)
      .all([collection, limit, offset]);
      collections.map(collection => list.push(JSON.parse(`{${collection.properties}}`)));
      return list;
  }
  const isCached = ({ entityType }) => {
    const numOfRows = db.prepare(`SELECT COUNT(1) as count FROM collections WHERE collection_type = ?`).get(entityType);
    return numOfRows?.count !== 0;
  }
  if(dbPath !== ':memory:') _reset();
  _createCacheTables();
  return {
    populate,
    get,
    isCached,
  }
}