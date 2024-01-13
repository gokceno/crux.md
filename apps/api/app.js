import express from 'express';
import bodyParser from 'body-parser';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { createHandler } from 'graphql-http/lib/use/express';
import { schema } from '@crux/graphql-schema';
import { Bucket } from '@crux/bucket';
import { Cache as BucketCache } from '@crux/bucket-cache-libsql';
import { FileSystem } from '@crux/bucket-source-filesystem';

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

// Set up buckets
const bucket = Bucket().load({
  source: FileSystem({ bucketPath: '../../samples/bucket' }),
  cache: BucketCache({
    dbPath: ':memory:',
    expires: '1 second',
  }),
});

const manifest = await bucket.manifest();


app.use(pinoHttpLogger);
app.use(bodyParser.json());
app.use(express.json());

app.all('/graphql', createHandler({ 
  schema: schema({ bucket, manifest }),
}));

(async () => {
  app.listen(8001);
  logger.info('crux.md GraphQL endpoints running 👊');
})();
