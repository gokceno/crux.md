export const Resolvers = ({ bucket }) => {
  const iterables = ['collection'];
  const filterables = ['collection'];
  const collection = async (collection, { filters, order, limit }) => {
    // TODO: Error is raised when filter or order is selected but no criteria is supplied
    // TODO: Sub-component handling in singles, is missing for collections
    if(bucket == undefined) throw new Error('Bucket must be defined');
    const manifest = await bucket.manifest();
    const expansions = manifest.collections
      .filter(item => Object.keys(item) == collection)
      .map(item => {
        return Object.values(item)[0].filter(prop => {
          if(typeof Object.values(prop)[0] === 'object') {
            return Object.values(Object.values(prop)[0]).filter(prop => typeof prop === 'string' && prop.includes('/')).length;
          }
          return typeof Object.values(prop)[0] === 'string' && Object.values(prop)[0].includes('/')
        }
      )
    });
    bucket
      .select({ collection })
      .filter({ filters })
      .order({ order });
    expansions[0].every(expand => bucket.expand({ expand }));
    return bucket.fetch(limit);
  }
  const single = async (single) => {
    if(bucket == undefined) throw new Error('Bucket must be defined');
    const manifest = await bucket.manifest();
    const expansions = manifest.singles
      .filter(item => Object.keys(item) == single)
      .map(item => {
        return Object.values(item)[0].filter(prop => {
          if(typeof Object.values(prop)[0] === 'object') {
            return Object.values(Object.values(prop)[0]).filter(prop => typeof prop === 'string' && prop.includes('/')).length;
          }
          return typeof Object.values(prop)[0] === 'string' && Object.values(prop)[0].includes('/')
        })
    });
    bucket.select({ single });
    expansions[0].every(expand => bucket.expand({ expand }));
    return bucket.fetch();
  }
  return { 
    collection,
    single,
    iterables,
    filterables,
  }
}