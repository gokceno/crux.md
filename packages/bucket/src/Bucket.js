import YAML from 'yaml';
import * as Comparison from '@gokceno/crux-comparison';
import * as Sort from '@gokceno/crux-sort';
import { typof } from '@gokceno/crux-typof';

export const Bucket = () => {
  let _cache;
  let _locale;
  let _source = {};
  let _collection;
  let _single;
  let _filters = [];
  let _order = [];
  let _expansions = [];
  function select({ collection, single }) {
    // TODO: Check if directories are readable 
    if(collection == undefined && single == undefined) 
        throw new Error('Collection and single are not defined, one of them must be selected.');
    _collection = collection;
    _single = single;
    return this;
  }
  function filter({ filters }) {
    if(filters !== undefined) {
      _filters = Object.entries(filters);
      return this;
    }
    _filters = [];
    return this;
  }
  function order({ order }) {
    if(order !== undefined) {
      _order = Object.entries(order);
      return this;
    }
    _order = [];
    return this;
  }
  function expand(expand) {
    if(expand !== undefined) {
      _expansions.push(expand);
    }
    return this;
  }
  function load({ source, cache, locale }) {
    if(source == undefined) throw new Error('Source is not defined'); // TODO: Check if directories are readable
    _source = source;
    _cache = cache;
    _locale = locale;
    return this;
  }
  function initCache(cache) {
    if(cache == undefined) throw new Error('Cache adapter is not defined');
    _cache = cache;
    return this;
  }
  const fetch = async (params) => {
    if(_collection !== undefined) return _fetchCollection(params);
    if(_single !== undefined) return _fetchSingle();
    throw new Error('Select failed.');
  }
  const manifest = async() => {
    // TODO: handle parse errors
    if(_cache === undefined) return YAML.parse(await _source.open({ filename: 'manifest.yml' }));
    if(!_cache.isCached({ isManifest: true })) {
      return _cache.populate({ isManifest: true, data: YAML.parse(await _source.open({ filename: 'manifest.yml' }))});
    }
    return _cache.get({ isManifest: true });
  }
  const _fetchCollection = async(params = {}) => {
    const { limit, offset = 0 } = params;
    if(!_cache.isCached({ collection: _collection, locale: _locale }) || limit === 1) {
      const list = await _source.list({ locale: _locale, collection: _collection, omitBody: !(limit === 1)  }); // TODO: prone to errors
      if(_source.isFiltered === true && _source.isOrdered === true && _source.isExpanded === true) return list;
      const expandedList = await list.map(item => {
        _expansions.map(async (expansion) => {
          if(typeof Object.values(expansion)[0] === 'string') {
            await _handleStringExpansion(expansion, item);
          } 
          else if (typeof Object.values(expansion)[0] === 'object') {
            await _handleObjectExpansion(expansion, item);
          } 
          else {
            throw new Error('YAML formatting error in expanding properties.');
          }
        });
        return item;
      });
      _cache.populate({ collection: _collection, data: expandedList, locale: _locale });
      const filteredList = expandedList.filter(item => {
        return _filters.every(([field, criteria]) => {
          const [ condition ] = Object.keys(criteria);
          const [ value ] = Object.values(criteria);
          return Comparison[typof(value)]()[condition](item[field], value);
        });
      });
      if(_order.length > 0 || filteredList.length > 0) {
        _order.every(([field, criteria]) => filteredList.sort((a,b) => Sort[criteria](a[field], b[field])));
      }
      let slicedList;
      if(limit !== undefined) {
        if(filteredList.length >= (offset + limit)) {
          slicedList = filteredList.slice(offset, offset + limit);
        }
        else {
          throw new Error('Not enough records to offset.');
        }
      }
      return (slicedList || filteredList);
    }
    return _cache.get({ collection: _collection, locale: _locale, filters: _filters, order: _order, limit, offset });
  }
  const _fetchSingle = async () => {
    if (!_cache.isCached({ single: _single, locale: _locale })) {
      let data = await _source.get({ locale: _locale, filename: _single });
      await _expansions.map(async (expansion) => {
        if(typeof Object.values(expansion)[0] === 'string') {
          await _handleStringExpansion(expansion, data);
        } 
        else if (typeof Object.values(expansion)[0] === 'object') {
          await _handleObjectExpansion(expansion, data);
        } 
        else {
          throw new Error('YAML formatting error in expanding properties.');
        }
      })
      return _cache.populate({ single: _single, data, locale: _locale });
    }
    return _cache.get({ single: _single, locale: _locale });
  }
  const _handleStringExpansion = async (expansion, data) => {
    const toReplace = await data[Object.keys(expansion)[0]];
    data[Object.keys(expansion)[0]] = async () => {
      const [collection, propName] = Object.values(expansion)[0].split('/');
      return (await _source.list({ locale: _locale, collection })).filter(item => (toReplace || []).includes(item[propName]));
    }
  }
  const _handleObjectExpansion = async (expansion, data) => {
    const toReplace = await data[Object.keys(expansion)[0]];
    await Object.entries(expansion).map(async ([componentName, componentItems]) => {
      await Object.entries(componentItems)
      .filter(([componentItemName, componentItemType]) => typeof componentItemType === 'string' && componentItemType.includes('/'))
      .map(async ([componentItemName, componentItemType]) => {
        if (data[componentName] !== undefined) {
          const toReplaceValue = await toReplace[componentItemName];
          const [collection, propName] = componentItemType.split('/');
          data[componentName][componentItemName] = await (async () => {
            const list = await _source.list({ locale: _locale, collection });
            return list.filter(item => (toReplaceValue || []).includes(item[propName]));
          }); // ();
        }
      })
    })
  }
  return {
    manifest,
    select,
    filter,
    order,
    load,
    expand,
    fetch,
    initCache,
  }
}
