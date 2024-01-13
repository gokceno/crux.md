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
          ${filters.map(([propName, propComparison]) => `MAX(CASE WHEN cp.prop_name = '${propName}' AND ${_constructWhere({ collection, propName, propComparison })} THEN 1 ELSE 0 END) = 1 AND`).join(' ')}
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
  const _constructWhere = ({ collection, propName, propComparison }) => {
    let statement = [];
    const compareBy = Object.keys(propComparison)[0];
    const compareWith = Object.values(propComparison)[0];
    const manifestDataType = manifest?.collections?.filter(f => Object.keys(f)[0] === collection)[0][collection]?.filter(f => Object.keys(f)[0] === propName)[0][propName];
    
    if(compareBy === '_eq') {
      if (['string', 'date'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') = '${compareWith.replaceAll("'", "''")}'`);
      if (['int', 'integer', 'number'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') = ${compareWith}`);
      if (['bool', 'boolean'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') IS ${compareWith}`);
    }
    if(compareBy === '_neq') {
      if (['string', 'date'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') != '${compareWith.replaceAll("'", "''")}'`);
      if (['int', 'integer', 'number'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') != ${compareWith}`);
      if (['bool', 'boolean'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') IS NOT ${compareWith}`);
    }
    if(compareBy === '_null') {
      statement.push(`COALESCE(JSON_EXTRACT(cp.prop_value, '$'), '') = ''`);
    }
    if(compareBy === '_nnull') {
      statement.push(`COALESCE(JSON_EXTRACT(cp.prop_value, '$'), '') != ''`);
    }
    if(compareBy === '_gt') {
      if (['date'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') > '${compareWith}'`);
      if (['int', 'integer', 'number'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') > ${compareWith}`);
    }
    if(compareBy === '_gte') {
      if (['date'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') >= '${compareWith}'`);
      if (['int', 'integer', 'number'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') >= ${compareWith}`);
    }
    if(compareBy === '_lt') {
      if (['date'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') < '${compareWith}'`);
      if (['int', 'integer', 'number'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') < ${compareWith}`);
    }
    if(compareBy === '_lte') {
      if (['date'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') <= '${compareWith}'`);
      if (['int', 'integer', 'number'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') <= ${compareWith}`);
    }
    return statement.join(' AND ');
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