import express from 'express';
import bodyParser from 'body-parser';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { createHandler } from 'graphql-http/lib/use/express';
import { schema } from '@crux/graphql-schema';

const app = express();

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
const pinoHttpLogger = pinoHttp(loggerOptions);

app.use(pinoHttpLogger);
app.use(bodyParser.json());
app.use(express.json());

app.all('/graphql', createHandler({ 
  schema,
}));

(async () => {
  app.listen(8001);
  logger.info('crux.md GraphQL endpoints running 👊');
})();
