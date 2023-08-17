export const Resolvers = ({ bucket }) => {
  const iterables = ['collection'];
  const filterables = ['collection'];
  const collection = async (collection, { filters, order }) => {
    // TODO: Error is raised when filter or order is selected but no criteria is supplied
    if(bucket == undefined) throw new Error('Bucket must be defined');
    return bucket
      .select({ collection })
      .filter({ filters })
      .order({ order })
      .fetch({ limit: 5, offset: 1 });
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