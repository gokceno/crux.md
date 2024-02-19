import Database from 'libsql';

export const Cache = ({ dbPath = ':memory:', expires = '600 SECONDS', manifest }) => {
  const db = new Database(dbPath);
  const populate = ({ isManifest, collection, single, data, locale }) => {
    if(isManifest === true) return _cacheManifest({ data });
    if(collection !== undefined) return _cacheCollection({ collection, data, locale });
    if(single !== undefined) return _cacheSingle({ single, data, locale });
    return false;
  }
  const get = ({ isManifest, collection, single, locale, filters, order, limit = -1, offset = 0 }) => { 
    if(isManifest === true) return _getManifest();
    if(collection !== undefined) return _getCollection({ collection, locale, filters, order, limit, offset });
    if(single !== undefined) return _getSingle({ single, locale });
    return {};
  }
  const isCached = ({ isManifest, collection, single, locale }) => {
    if(isManifest === true) return _isManifestCached();
    if(collection !== undefined) return _isCollectionCached({ collection, locale });
    if(single !== undefined) return _isSingleCached({ single, locale });
    return false;
  }
  const _createCacheTables = () => {
    db.exec(`CREATE TABLE IF NOT EXISTS singles (id INTEGER PRIMARY KEY, single_type TEXT, locale TEXT, _cached_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS singles_props (id INTEGER PRIMARY KEY, single_id INTEGER, prop_name TEXT, prop_value JSON)`);
    db.exec(`CREATE TABLE IF NOT EXISTS collections (id INTEGER PRIMARY KEY, collection_type TEXT, collection_id TEXT, locale TEXT, _cached_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS collections_props (id INTEGER PRIMARY KEY, collection_id INTEGER, prop_name TEXT, prop_value JSON)`);
    db.exec(`CREATE TABLE IF NOT EXISTS manifest (id INTEGER PRIMARY KEY, body JSON, _cached_at TEXT)`);
  }
  const _flush = () => ['singles', 'singles_props', 'collections', 'collections_props', 'manifest'].map(collection => db.exec(`DELETE FROM ${collection}`));
  // const _reset = () => ['singles', 'singles_props', 'collections', 'collections_props', 'manifest'].map(collection => db.exec(`DROP TABLE IF EXISTS ${collection}`));
  const _isManifestCached = () => !!db.prepare(`SELECT COUNT(1) as count FROM manifest m WHERE DATETIME(m._cached_at, ?) >= DATETIME()`).get(expires)?.count;
  const _isCollectionCached = ({ collection, locale }) => !!db.prepare(`SELECT COUNT(1) as count FROM collections c WHERE DATETIME(c._cached_at, ?) >= DATETIME() AND c.collection_type = ? AND (c.locale IS NULLIF(?, 'NULL') OR c.locale = ?)`).get([expires, collection, locale])?.count;
  const _isSingleCached = ({ single, locale }) => !!db.prepare(`SELECT COUNT(1) as count FROM singles s WHERE DATETIME(s._cached_at, ?) >= DATETIME() AND s.single_type = ? AND (s.locale IS NULLIF(?, 'NULL') OR s.locale = ?)`).get([expires, single, locale])?.count;
  const _getCollection = ({ collection, locale, filters, order, limit = -1, offset = 0 }) => {
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
      WHERE 
      DATETIME(c._cached_at, '+${expires}') >= DATETIME()
      AND (c.locale IS NULLIF(?, 'NULL') OR c.locale = ?)
      GROUP BY
      c.id
      HAVING 
      ${filters.map(([propName, propComparison]) => `MAX(CASE WHEN cp.prop_name = '${propName}' AND ${_constructWhere({ collection, propName, propComparison })} THEN 1 ELSE 0 END) = 1 AND`).join(' ')}
      c.collection_type = ?
      ORDER BY
      ${order.map(o => `MAX(CASE WHEN cp.prop_name = '${o[0]}' THEN cp.prop_value ELSE NULL END) COLLATE NOCASE ${o[1]},`).join(' ')}
      MAX(cp.prop_value) ASC
      LIMIT ? OFFSET ?
      `)
    .all([locale, locale, collection, limit, offset]);
    collections.map(collection => list.push(JSON.parse(`{${collection.properties}}`)));
    return list;
  }
  const _getSingle = ({ single, locale }) => {
    const row = db
    .prepare(`
      SELECT
      s.id AS single_id, 
      GROUP_CONCAT('"' || sp.prop_name || '":' || sp.prop_value) AS properties
      FROM singles s
      LEFT JOIN singles_props sp ON s.id = sp.single_id
      WHERE 
      s.single_type = ?
      AND (s.locale IS NULLIF(?, 'NULL') OR s.locale = ?)
      AND DATETIME(s._cached_at, '+${expires}') >= DATETIME()
      `)
    .get([single, locale]);
    return JSON.parse(`{${row.properties}}`);
  }
  const _getManifest = () => JSON.parse(db.prepare(`SELECT m.body FROM manifest m WHERE DATETIME(m._cached_at, ?) >= DATETIME()`).get(expires)?.body || '{}');  

  const _cacheCollection = ({ collection, data, locale }) => {
    _flush();
    data.map(async item => {
      const row = db.prepare(`INSERT INTO collections (collection_type, collection_id, locale, _cached_at) VALUES (?, ?, ?, DATETIME())`).run([collection,item._id, locale]);
      const statement = db.prepare(`INSERT INTO collections_props (collection_id, prop_name, prop_value) VALUES (?, ?, ?)`);
      Object.keys(item).map(async (prop) => {
        if (typeof item[prop] === 'function' && item[prop].constructor.name === 'AsyncFunction') {
          const data = await item[prop]();
          const expandedData = await Promise.all(data.map(async (expand) => {
            let returnObject = {};
            await Promise.all(Object.entries(expand).map(async ([propName, propValue]) =>
              returnObject[propName] = typeof propValue === 'function' ? await propValue() : propValue
            ));
            return returnObject;
          }));
          statement.run([row.lastInsertRowid, prop, JSON.stringify(expandedData)]);
        }
        else {
          statement.run([row.lastInsertRowid, prop, JSON.stringify(await item[prop])]);
        }
      });
    });
    return data;
  }
  /*
  const _cacheSingle = ({ single, data, locale }) => {
    _flush();
    const row = db.prepare(`INSERT INTO singles (single_type, locale, _cached_at) VALUES (?, ?, DATETIME())`).run([single, locale]);
    const statement = db.prepare(`INSERT INTO singles_props (single_id, prop_name, prop_value) VALUES (?, ?, ?)`);
    Object.keys(data).map(async (prop) => {
      if (typeof data[prop] === 'function' && data[prop].constructor.name === 'AsyncFunction') {
        const expandableData = await data[prop]();
        const expandedData = await Promise.all(expandableData.map(async (expand) => {
          let returnObject = {};
          await Promise.all(Object.entries(expand).map(async ([propName, propValue]) =>
            returnObject[propName] = typeof propValue === 'function' ? await propValue() : propValue
          ));
          return returnObject;
        }));
        statement.run([row.lastInsertRowid, prop, JSON.stringify(expandedData)]);
      }
      else {
        statement.run([row.lastInsertRowid, prop, JSON.stringify(await data[prop])]);
      }
    });
    return data;
  }
  */
  const _cacheSingle = ({ single, data, locale }) => {
    _flush();
    const row = db.prepare(`INSERT INTO singles (single_type, locale, _cached_at) VALUES (?, ?, DATETIME())`).run([single, locale]);
    const statement = db.prepare(`INSERT INTO singles_props (single_id, prop_name, prop_value) VALUES (?, ?, ?)`);
    Object.keys(data).map(async (prop) => {
      if (typeof data[prop] === 'function' && data[prop].constructor.name === 'AsyncFunction') {
        statement.run([row.lastInsertRowid, prop, JSON.stringify(await data[prop]())]);
      }
      else {
        statement.run([row.lastInsertRowid, prop, JSON.stringify(data[prop])]);
      }
    });
    return data;
  }
  const _cacheManifest = ({ data }) => {
    // TODO: No garbage collection is made
    if(data !== undefined && typeof(data) === 'object') {
      db.prepare(`INSERT INTO manifest (body, _cached_at) VALUES (?, DATETIME())`).run(JSON.stringify(data));
    }
    return data;
  }
  const _constructWhere = ({ collection, propName, propComparison }) => {
    const _whereComponents = {
      _eq: (manifestDataType, compareWith) => {
        let statement = [];
        if (['string', 'date'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') = '${compareWith.replaceAll("'", "''")}'`);
        if (['int', 'integer', 'number'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') = ${compareWith}`);
        if (['bool', 'boolean'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') IS ${compareWith}`);
        return statement;
      },
      _neq: (manifestDataType, compareWith) => {
        if (['string', 'date'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') != '${compareWith.replaceAll("'", "''")}'`);
        if (['int', 'integer', 'number'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') != ${compareWith}`);
        if (['bool', 'boolean'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') IS NOT ${compareWith}`);
        return statement;
      },
      _null: (manifestDataType, compareWith) => {
        statement.push(`COALESCE(JSON_EXTRACT(cp.prop_value, '$'), '') = ''`);
        return statement;
      },
      _nnull: (manifestDataType, compareWith) => {
        statement.push(`COALESCE(JSON_EXTRACT(cp.prop_value, '$'), '') != ''`);
        return statement;
      },
      _lt: (manifestDataType, compareWith) => {
        if (['date'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') < '${compareWith}'`);
        if (['int', 'integer', 'number'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') < ${compareWith}`);
        return statement;
      },
      _gt: (manifestDataType, compareWith) => {
        if (['date'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') > '${compareWith}'`);
        if (['int', 'integer', 'number'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') > ${compareWith}`);
        return statement;
      },
      _lte: (manifestDataType, compareWith) => {
        if (['date'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') <= '${compareWith}'`);
        if (['int', 'integer', 'number'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') <= ${compareWith}`);
        return statement;
      },
      _gte: (manifestDataType, compareWith) => {
        if (['date'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') >= '${compareWith}'`);
        if (['int', 'integer', 'number'].includes(manifestDataType)) statement.push(`JSON_EXTRACT(cp.prop_value, '$') >= ${compareWith}`);
        return statement;
      }
    };
    const compareBy = Object.keys(propComparison)[0];
    const compareWith = Object.values(propComparison)[0];
    const manifestDataType = manifest?.collections?.filter(f => Object.keys(f)[0] === collection)[0][collection]?.filter(f => Object.keys(f)[0] === propName)[0][propName];
    let statement = [];
    statement.push(
      ..._whereComponents[compareBy](manifestDataType, compareWith)
      );
    return statement.join(' AND ');
  }

  // Init Cache
  _createCacheTables();

  return {
    populate,
    get,
    isCached,
  }
}