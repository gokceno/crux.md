import dotenv from 'dotenv';

dotenv.config();

export default {
  driver: 'libsql',
  schema: '../../packages/router-db/src/index.js', // TODO: Dependency to child?
  out: process.env.LIBSQL_MIGRATIONS_PATH,
  dbCredentials: {
    url: process.env.LIBSQL_URL,
    authToken: process.env.LIBSQL_AUTH_TOKEN,
  },
  verbose: true,
}