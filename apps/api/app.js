import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { Router } from '@gokceno/crux-router';
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from '@libsql/client';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from "./src/schema.js";

dotenv.config();

// Set up DB
const libsqlClient = createClient({ url: process.env.LIBSQL_DB_PATH || 'file:./db/crux.sqlite' });
const db = drizzle(libsqlClient);

// Apply migrations
await migrate(db, { migrationsFolder: process.env.LIBSQL_MIGRATIONS_PATH || './db/migrations' });

// Set up logging
const loggerOptions = {
  level: process.env.LOGLEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  },
};
const logger = pino(loggerOptions);

const app = express();

if(process.env.ENV !== 'production') {
  const pinoHttpLogger = pinoHttp(loggerOptions);
  app.use(pinoHttpLogger);
}

app.use(bodyParser.json());
app.use(express.json());

app.get('/', (req, res) => res.redirect('https://github.com/gokceno/crux.md'));
app.all('/graphql', async (req, res) => Router({ db, schema }).handle(req, res));

(async () => {
  const port = process.env.PORT || 8001;
  app.listen(port);
  logger.info(`crux.md GraphQL endpoints running on port ${port} 👊`);
})();
