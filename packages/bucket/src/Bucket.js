import YAML from 'yaml';
import * as Comparison from '@crux/comparison';
import * as Sort from '@crux/sort';
import { typof } from '@crux/typof';

export const Bucket = () => {
  let _cache;
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
  function expand({ expand }) {
    if(expand !== undefined) {
      _expansions.push(expand);
    }
    return this;
  }
  function load({ source, cache }) {
    if(source == undefined) throw new Error('Source is not defined'); // TODO: Check if directories are readable
    _source = source;
    _cache = cache;
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
  const _fetchCollection = async(params = {}) => {
    const { limit, offset = 0 } = params;
    if(!_cache.isCached({ entityType: _collection }) || limit === 1) {
      const list = await _source.list({ collection: _collection, omitBody: !(limit === 1)  });
      if(_source.isFiltered === true && _source.isOrdered === true && _source.isExpanded === true) return list;
      const expandedList = list.map(item => {
        _expansions.every(expansion => {
          const toReplace = item[Object.keys(expansion)[0]];
          item[Object.keys(expansion)[0]] = async () => {
            const [ collection, propName ] = Object.values(expansion)[0].split('/');
            return (await _source.list({ collection })).filter(item => (toReplace || []).includes(item[propName]));
          }
        });
        return item;
      });
      _cache.populate({ collection: _collection, data: expandedList });
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
    return _cache.get({ collection: _collection, filters: _filters, order: _order, limit, offset });
  }
  const _fetchSingle = async() => {
    let data = await _source.get({ filename: _single });
    _expansions.every(expansion => {
      const toReplace = data[Object.keys(expansion)[0]];
      data[Object.keys(expansion)[0]] = async () => {
        const [ collection, propName ] = Object.values(expansion)[0].split('/');
        return (await _source.list({ collection })).filter(item => (toReplace || []).includes(item[propName]));
      }
    });
    return data;
  }
  //TODO: handle parse errors
  const manifest = async() => YAML.parse(await _source.open({ filename: 'manifest.yml' }))
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
