export const Resolvers = ({ bucket }) => {
  const iterables = ['collection'];
  const filterables = ['collection'];
  const collection = async (collection, { filters, order, limit }) => {
    // TODO: Error is raised when filter or order is selected but no criteria is supplied
    if(bucket == undefined) throw new Error('Bucket must be defined');
    const manifest = await bucket.manifest();
    const [ expansions ] = manifest.collections
      .filter(item => Object.keys(item) == collection)
      .map(item => {
        // eslint-disable-next-line no-unused-vars
        return Object.entries(Object.values(item)[0]).filter(([name, type]) => {
          if(typeof type === 'object') {
            return Object.values(type).filter(prop => typeof prop === 'string' && prop.includes('/')).length;
          }
          return typeof type === 'string' && type.includes('/')
        }
      )
    });
    bucket
      .select({ collection })
      .filter({ filters })
      .order({ order });
    expansions.every(expand => bucket.expand({ [expand[0]]: expand[1] }));
    return bucket.fetch({ manifest, limit });
  }
  const single = async (single) => {
    if(bucket == undefined) throw new Error('Bucket must be defined');
    const manifest = await bucket.manifest();
    const [ expansions ] = manifest.singles
      .filter(item => Object.keys(item) == single)
      .map(item => {
        // eslint-disable-next-line no-unused-vars
        return Object.entries(Object.values(item)[0]).filter(([name, type]) => {
          if(typeof type === 'object') {
            return Object.values(type).filter(prop => typeof prop === 'string' && prop.includes('/')).length;
          }
          return typeof type === 'string' && type.includes('/')
        }
      )
    });
    bucket.select({ single });
    expansions.every(expand => bucket.expand({ [expand[0]]: expand[1] }));
    return bucket.fetch({ manifest });
  }
  return { 
    collection,
    single,
    iterables,
    filterables,
  }
}