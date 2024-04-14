import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { Router } from '@gokceno/crux-router';

dotenv.config();

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

if(process.env.ENV !== 'production') {
  const pinoHttpLogger = pinoHttp(loggerOptions);
  app.use(pinoHttpLogger);
}

app.use(bodyParser.json());
app.use(express.json());

app.get('/', (req, res) => res.redirect('https://github.com/gokceno/crux.md'));
app.all('/graphql', async (req, res) => Router().handle(req, res));

(async () => {
  app.listen(8001);
  logger.info('crux.md GraphQL endpoints running on port 8001 👊');
})();
