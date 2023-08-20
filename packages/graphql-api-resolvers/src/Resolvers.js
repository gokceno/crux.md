export const Resolvers = ({ bucket }) => {
  const iterables = ['collection'];
  const filterables = ['collection'];
  const collection = async (collection, { filters, order }) => {
    // TODO: Error is raised when filter or order is selected but no criteria is supplied
    if(bucket == undefined) throw new Error('Bucket must be defined');
    const manifest = await bucket.manifest();
    const expansions = manifest.collections
      .filter(item => Object.keys(item) == collection)
      .map(item => {
        return Object.values(item)[0].filter(prop => {
          return Object.values(prop)[0].includes('/')
        }
      )
    });
    bucket
      .select({ collection })
      .filter({ filters })
      .order({ order });
    expansions[0].every(expand => bucket.expand({ expand }));
    return bucket.fetch({ limit: 5, offset: 1 });
  }
  const single = async (single) => {
    if(bucket == undefined) throw new Error('Bucket must be defined');
    return bucket
      .select({ single })
      .fetch();
  }
  return { 
    collection,
    single,
    iterables,
    filterables,
  }
}