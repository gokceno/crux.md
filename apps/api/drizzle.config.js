import dotenv from 'dotenv';

dotenv.config();

export default {
  driver: 'libsql',
  schema: './src/schema.js',
  out: process.env.LIBSQL_MIGRATIONS_PATH || './db/migrations',
  dbCredentials: {
    url: process.env.LIBSQL_DB_PATH || 'file:./db/crux.sqlite',
  },
  verbose: true,
  strict: true,
}