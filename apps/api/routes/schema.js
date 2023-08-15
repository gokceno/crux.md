import YAML from 'yaml';
import fs from 'fs/promises'
import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { Resolvers } from '@crux/graphql-api-resolvers';
import { transform } from '@crux/graphql-api';

const config = YAML.parse(
  await fs.readFile('../../samples/schema.yml', 'utf8')
);

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: () => {
      const fields = {};
      config.collections.map(node => transform({ node, resolver: Resolvers(), resolveBy: 'collection' })).forEach(field => {
        fields[Object.keys(field)[0]] = field[Object.keys(field)[0]];
      });
      config.singles.map(node => transform({ node, resolver: Resolvers(), resolveBy: 'single' })).forEach(field => {
        fields[Object.keys(field)[0]] = field[Object.keys(field)[0]];
      });
      return fields;
    }
  }),
});

export { schema }