import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { Bucket } from '@crux/bucket';
import { Cache as BucketCache } from '@crux/bucket-cache-libsql';
import { FileSystem } from '@crux/bucket-source-filesystem';
import { Resolvers } from '@crux/graphql-api-resolvers';
import { transform } from '@crux/graphql-api';

const bucket = Bucket().load({
  source: FileSystem({ bucketPath: '../../samples/bucket' }),
  cache: BucketCache(),
});

const manifest = await bucket.manifest();

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: () => {
      const fields = {};
      manifest.collections.map(node => transform({ nodes: manifest.collections, node, resolver: Resolvers({ bucket }), resolveBy: 'collection' })).forEach(field => {
        fields[Object.keys(field)[0]] = field[Object.keys(field)[0]];
      });
      manifest.singles.map(node => transform({ nodes: manifest.collections, node, resolver: Resolvers({ bucket }), resolveBy: 'single' })).forEach(field => {
        fields[Object.keys(field)[0]] = field[Object.keys(field)[0]];
      });
      return fields;
    }
  }),
});

export { schema }