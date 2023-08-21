import YAML from 'yaml';
import * as Comparison from '@crux/comparison';

export const Bucket = () => {
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
  function load({ source }) {
    // TODO: Check if directories are readable
    if(source == undefined) throw new Error('Source is not defined');
    _source = source;
    return this;
  }
  const fetch = async (params) => {
    if(_collection !== undefined) return _fetchCollection(params);
    if(_single !== undefined) return _fetchSingle();
    throw new Error('Select failed.');
  }
  const _fetchCollection = async(params = {}) => {
    const { limit, offset } = params;
    if(_source.isFiltered === true && _source.isOrdered === true && _source.isExpanded === true) 
      return await _source.list({ collection: _collection });
    const filteredList = (await _source.list({ collection: _collection })).filter(item => {
      return _filters.every(([field, criteria]) => {
        const [ condition ] = Object.keys(criteria);
        const [ value ] = Object.values(criteria);
        return Comparison[condition](item[field], value);
      });
    });
    if(_order.length > 0 || filteredList.length > 0) {
      _order.every(([field, criteria]) => {
        filteredList.sort((a, b) => {
          if(a == b) return 0;
          if(criteria === '_desc') {
            return b[field].localeCompare(a[field]);
          }
          return a[field].localeCompare(b[field]);
        });
      });
    }
    let slicedList;
    if(limit !== undefined && offset !== undefined) {
      if(filteredList.length >= (offset + limit)) {
        slicedList = filteredList.slice(offset, offset + limit);
      }
      else {
        throw new Error('Not enough records to offset.');
      }
    }
    const expandedList = (slicedList || filteredList).map(item => {
      _expansions.every(expansion => {
        const toReplace = item[Object.keys(expansion)[0]];
        item[Object.keys(expansion)[0]] = async () => {
          const [ collection, propName ] = Object.values(expansion)[0].split('/');
          return (await _source.list({ collection })).filter(item => (toReplace || []).includes(item[propName]));
        }
      });
      return item;
    });

    return expandedList;
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
  }
}