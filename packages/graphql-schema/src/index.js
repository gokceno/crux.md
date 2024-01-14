import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { Resolvers } from '@gokceno/crux-graphql-api-resolvers';
import { transform } from '@gokceno/crux-graphql-api';


const schema = ({ bucket, manifest }) => new GraphQLSchema({
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