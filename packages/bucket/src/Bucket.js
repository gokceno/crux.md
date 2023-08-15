import { Comparison } from '@crux/comparison';

export const Bucket = () => {
  let _source = {};
  let _collection;
  let _single;
  let _filters = [];
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
    }
    return this;
  }
  function load({ source }) {
    // TODO: Check if directories are readable
    if(source == undefined) throw new Error('Source is not defined');
    _source = source;
    return this;
  }
  const fetch = async () => {
    if(_collection !== undefined) return _fetchCollection();
    if(_single !== undefined) return _fetchSingle();
    throw new Error('Select failed.');
  }
  const _fetchCollection = async() => {
    if(_source.isFiltered || _filters === undefined) return (await _source.list({ collection: _collection }));
    const filteredList = (await _source.list({ collection: _collection })).filter(item => {
      return _filters.every(([field, criteria]) => {
        const [ condition ] = Object.keys(criteria);
        const [ value ] = Object.values(criteria);
        return Comparison()[condition](item[field], value);
      });
    });
    return filteredList;
  }
  const _fetchSingle = async() => {
    return (await _source.get({ filename: _single }));
  }
  return {
    select,
    filter,
    load,
    fetch,
  }
}