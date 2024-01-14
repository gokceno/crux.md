import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { createHandler } from 'graphql-http/lib/use/express';
import { schema } from '@gokceno/crux-graphql-schema';
import { Bucket } from '@gokceno/crux-bucket';
import { Cache as BucketCache } from '@gokceno/crux-bucket-cache-libsql';
import { FileSystem } from '@gokceno/crux-bucket-source-filesystem';
import { GitHub } from '@gokceno/crux-bucket-source-github';

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
const pinoHttpLogger = pinoHttp(loggerOptions);

// Set up buckets
const bucket = Bucket().load({
  // source: FileSystem({ bucketPath: '../../samples/bucket' }),
  source: GitHub({
    owner: 'gokceno',
    repo: 'crux.md',
    basePath: 'samples/bucket',
    auth: process.env.GITHUB_TOKEN,
  })
});

const manifest = await bucket.manifest();

bucket.initCache(BucketCache({
  dbPath: ':memory:',
  expires: '100 SECONDS',
  manifest,
}));

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
