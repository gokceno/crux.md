import { Bucket } from '@crux/bucket';
import { Source } from '@crux/source';

export const Resolvers = () => {
  const iterables = ['collection'];
  const filterables = ['collection'];
  const bucket = Bucket().load({
    source: Source().FileSystem({ bucketPath: '../../samples/bucket' })
  });
  const collection = async (collection, { filters }) => {
    return bucket
      .select({ collection })
      .filter({ filters })
      .fetch({ limit: 5, offset: 1 });
  }
  const single = async (single) => {
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