export const Resolvers = ({ bucket }) => {
  const iterables = ['collection'];
  const filterables = ['collection'];
  const collection = async (collection, { filters }) => {
    if(bucket == undefined) throw new Error('Bucket must be defined');
    return bucket
      .select({ collection })
      .filter({ filters })
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