import YAML from 'yaml';
import { Comparison } from '@crux/comparison';

export const Bucket = () => {
  let _source = {};
  let _collection;
  let _single;
  let _filters = [];
  let _order = [];
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
  function load({ source }) {
    // TODO: Check if directories are readable
    if(source == undefined) throw new Error('Source is not defined');
    _source = source;
    return this;
  }
  const manifest = async() => YAML.parse(await _source.open({ filename: 'manifest.yml' }))
  const fetch = async () => {
    if(_collection !== undefined) return _fetchCollection();
    if(_single !== undefined) return _fetchSingle();
    throw new Error('Select failed.');
  }
  const _fetchCollection = async() => {
    if(_source.isFiltered === true && _source.isOrdered === true && _source.isExpanded === true) 
      return await _source.list({ collection: _collection });
    const filteredList = (await _source.list({ collection: _collection })).filter(item => {
      return _filters.every(([field, criteria]) => {
        const [ condition ] = Object.keys(criteria);
        const [ value ] = Object.values(criteria);
        return Comparison()[condition](item[field], value);
      });
    });
    if(_order.length == 0) return filteredList;
    // TODO: should order dates
    // TODO: should order numbers
    _order.every(([field, criteria]) => {
      return filteredList.sort((a, b) => {
        if(a == b) return 0;
        if(criteria === '_desc') {
          return b[field].localeCompare(a[field]);
        }
        return a[field].localeCompare(b[field]);
      });
    });
    return filteredList;
  }
  const _fetchSingle = async() => {
    return (await _source.get({ filename: _single }));
  }
  return {
    manifest,
    select,
    filter,
    order,
    load,
    fetch,
  }
}