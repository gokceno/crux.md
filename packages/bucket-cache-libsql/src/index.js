import Database from 'libsql';

export const Cache = ({ dbPath = ':memory:', expires = '600 SECONDS' }) => {
  const db = new Database(dbPath);
  const populate = ({ isManifest, collection, single, data, locale }) => {
    if(isManifest === true) return _cacheManifest({ data });
    if(collection !== undefined) return _cacheCollection({ collection, data, locale });
    if(single !== undefined) return _cacheSingle({ single, data, locale });
    return false;
  }
  const get = ({ isManifest, collection, single, locale }) => { 
    if(isManifest === true) return _getManifest();
    if(collection !== undefined) return _getCollection({ collection, locale });
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
    // TODO: Missinng UNIQUE index.
    db.exec(`CREATE TABLE IF NOT EXISTS singles (id INTEGER PRIMARY KEY, single_type TEXT, locale TEXT, _cached_at TEXT)`);
    db.exec(`CREATE TABLE IF NOT EXISTS singles_props (id INTEGER PRIMARY KEY, single_id INTEGER, prop_name TEXT, prop_value JSON, FOREIGN KEY (single_id) REFERENCES singles(id) ON DELETE CASCADE)`);
    db.exec(`CREATE TABLE IF NOT EXISTS collections (id INTEGER PRIMARY KEY, collection_type TEXT, collection_id TEXT, locale TEXT, _cached_at TEXT, UNIQUE(collection_type, collection_id, locale))`);
    db.exec(`CREATE TABLE IF NOT EXISTS collections_props (id INTEGER PRIMARY KEY, collection_id INTEGER, prop_name TEXT, prop_value JSON, FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE)`);
    db.exec(`CREATE TABLE IF NOT EXISTS manifest (id INTEGER PRIMARY KEY, body JSON, _cached_at TEXT)`);
  }
  // FIXME: locale not implemented
  const _flush = (tables = []) => tables.map(table => db.exec(`DELETE FROM ${table} WHERE DATETIME(_cached_at, '${expires}') <= DATETIME()`));
  const _isManifestCached = () => !!db.prepare(`SELECT COUNT(1) as count FROM manifest m WHERE DATETIME(m._cached_at, ?) >= DATETIME()`).get(expires)?.count;
  const _isCollectionCached = ({ collection, locale }) => !!db.prepare(`SELECT COUNT(1) as count FROM collections c WHERE DATETIME(c._cached_at, ?) >= DATETIME() AND c.collection_type = ? AND (c.locale IS NULLIF(?, 'NULL') OR c.locale = ?)`).get([expires, collection, locale])?.count;
  const _isSingleCached = ({ single, locale }) => !!db.prepare(`SELECT COUNT(1) as count FROM singles s WHERE DATETIME(s._cached_at, ?) >= DATETIME() AND s.single_type = ? AND (s.locale IS NULLIF(?, 'NULL') OR s.locale = ?)`).get([expires, single, locale])?.count;
  const _getCollection = ({ collection, locale }) => {
    let list = [];
    const collections = db
      .prepare(`
        SELECT
          c.id AS collection_id, 
          GROUP_CONCAT('"' || cp.prop_name || '":' || cp.prop_value) AS properties
        FROM 
          collections c
        LEFT JOIN 
          collections_props cp ON c.id = cp.collection_id
        WHERE 
          DATETIME(c._cached_at, ?) >= DATETIME()
          AND (c.locale IS NULLIF(?, 'NULL') OR c.locale = ?)
          AND c.collection_type = ?
        GROUP BY c.id
      `)
      .all([expires, locale, locale, collection]);
    collections.map(collection => list.push(JSON.parse(`{${collection.properties}}`)));
    return list;
  }
  const _getSingle = ({ single, locale }) => {
    const row = db
    .prepare(`
      SELECT
        s.id AS single_id, 
        GROUP_CONCAT('"' || sp.prop_name || '":' || sp.prop_value) AS properties
      FROM 
        singles s
      LEFT JOIN singles_props sp ON s.id = sp.single_id
      WHERE 
        s.single_type = ?
        AND (s.locale IS NULLIF(?, 'NULL') OR s.locale = ?)
        AND DATETIME(s._cached_at, ?) >= DATETIME()
    `)
    .get([expires, single, locale]);
    return JSON.parse(`{${row.properties}}`);
  }
  const _getManifest = () => JSON.parse(db.prepare(`SELECT m.body FROM manifest m WHERE DATETIME(m._cached_at, ?) >= DATETIME()`).get(expires)?.body || '{}');
  const _cacheCollection = async ({ collection, data, locale }) => {
    _flush(['collections']);
    data.map(async item => {
      const resolved = await Promise.resolve(item) || {};
      // TODO: insert into ... select ... where not exits ... would be ideal compared to catching errors.
      try {
        const row = db.prepare(`INSERT INTO collections (collection_type, collection_id, locale, _cached_at) VALUES (?, ?, ?, DATETIME())`).run([collection, resolved._id, locale]);
        const statement = db.prepare(`INSERT INTO collections_props (collection_id, prop_name, prop_value) VALUES (?, ?, ?)`);
        Object.entries(resolved)
        // eslint-disable-next-line no-unused-vars
        .filter(([propName, propValue]) => propValue !== undefined && propValue !== null)
        .map(async ([propName, propValue]) => {
          if(typeof propValue === 'function' && propValue.constructor.name === 'AsyncFunction') {
            const expandedData = await Promise.all((await (await propValue)()).map(async (expand) => {
              let returnObject = {};
              Object.entries(expand).map(async ([propName, propValue]) =>
                returnObject[propName] = typeof propValue === 'function' ? (await Promise.resolve(propValue())) : propValue
                );
              return returnObject;
            }));
            statement.run([row.lastInsertRowid, propName, JSON.stringify(expandedData)]);
          }
          else if(typeof propValue === 'object' && !Array.isArray(propValue)) {
            let returnObject = {};
            await Promise.all(Object.entries(propValue).map(async ([propName, propValue]) => {
              returnObject[propName] = typeof propValue === 'function' ? (await Promise.resolve(propValue())) : propValue
              if(typeof returnObject[propName] === 'object') {
                Object.entries(returnObject[propName]).map(([x, y]) => {
                  Object.entries(y)
                  // eslint-disable-next-line no-unused-vars
                  .filter(([a ,b]) => typeof b === 'function')
                  .map(async ([a, b]) => returnObject[propName][x][a] = await b());
                });
              }
            }));
            statement.run([row.lastInsertRowid, propName, JSON.stringify(returnObject)]);
          }
          else {
            statement.run([row.lastInsertRowid, propName, JSON.stringify(propValue)]);
          }
        });
      }
      catch(e) {
        switch(e.code) {
        case 'SQLITE_CONSTRAINT_UNIQUE':
          break;
        default:
          throw new Error(e);
        }
      }
    });
    return data;
  }
  const _cacheSingle = ({ single, data, locale }) => {
    _flush(['singles']);
    const row = db.prepare(`INSERT INTO singles (single_type, locale, _cached_at) VALUES (?, ?, DATETIME())`).run([single, locale]);
    const statement = db.prepare(`INSERT INTO singles_props (single_id, prop_name, prop_value) VALUES (?, ?, ?)`);
    Object.entries(data).map(async ([propName, propValue]) => {
      if(typeof propValue === 'function' && propValue.constructor.name === 'AsyncFunction') {
        const expandedData = await Promise.all((await (await propValue)()).map(async (expand) => {
          let returnObject = {};
          Object.entries(expand).map(async ([propName, propValue]) => {
            returnObject[propName] = typeof propValue === 'function' ? (await Promise.resolve(propValue())) : propValue
          });
          return returnObject;
        }));
        statement.run([row.lastInsertRowid, propName, JSON.stringify(expandedData)]);
      }
      else if(typeof propValue === 'object' && !Array.isArray(propValue)) {
        let returnObject = {};
        await Promise.all(Object.entries(propValue).map(async ([propName, propValue]) => {
          returnObject[propName] = typeof propValue === 'function' ? (await Promise.resolve(propValue())) : propValue
          if(typeof returnObject[propName] === 'object') {
            Object.entries(returnObject[propName]).map(([x, y]) => {
              Object.entries(y)
              // eslint-disable-next-line no-unused-vars
              .filter(([a ,b]) => typeof b === 'function')
              .map(async ([a, b]) => returnObject[propName][x][a] = await b());
            });
          }
        }));
        statement.run([row.lastInsertRowid, propName, JSON.stringify(returnObject)]);
      }
      else {
        statement.run([row.lastInsertRowid, propName, JSON.stringify(propValue)]);
      }
    });
    return data;
  }
  const _cacheManifest = ({ data }) => {
    if(data !== undefined && typeof(data) === 'object') {
      _flush(['manifest']);
      db.prepare(`INSERT INTO manifest (body, _cached_at) VALUES (?, DATETIME())`).run(JSON.stringify(data));
    }
    return data;
  }

  // Init Cache
  _createCacheTables();

  return {
    populate,
    get,
    isCached,
  }
}