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
import { locales } from '@gokceno/crux-locales';

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

app.use(pinoHttpLogger);
app.use(bodyParser.json());
app.use(express.json());

app.all('/graphql', async (req, res) => {
  // Set up buckets
  const bucket = Bucket().load({
    ...(req.acceptsLanguages()[0] !== '*') ? { locale: req.acceptsLanguages(locales) } : {},
    // source: FileSystem({ bucketPath: '../../../koc-system-website/apps/api/.bucket' }),
    source: GitHub({
      owner: 'gokceno',
      repo: 'crux.md',
      basePath: 'samples/bucket',
      auth: process.env.GITHUB_TOKEN,
    })
  });
  const manifest = await bucket.manifest();
  bucket.initCache(BucketCache({
    dbPath: ':memory:', // Use memory only if defined global otherwise it's useless as it recreates cache on every request.
    expires: '100 SECONDS',
    manifest,
  }));
  const handler = createHandler({ 
    schema: schema({ bucket, manifest }),
  });
  return handler(req, res);
});

(async () => {
  app.listen(8001);
  logger.info('crux.md GraphQL endpoints running on port 8001 👊');
})();
