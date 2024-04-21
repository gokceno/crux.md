import { createHandler } from 'graphql-http/lib/use/express';
import { schema as graphQLSchema } from '@gokceno/crux-graphql-schema';
import { Bucket } from '@gokceno/crux-bucket';
import { Cache as BucketCache } from '@gokceno/crux-bucket-cache-libsql';
import { GitHub } from '@gokceno/crux-bucket-source-github';
import { locales } from '@gokceno/crux-locales';
import { eq } from 'drizzle-orm';
import path from 'path';

export const Router = ({ db, schema }) => {
	const handle = async(req, res) => {
		// eslint-disable-next-line no-unused-vars
		const [authType, accessKey] = req.headers['authorization'].split(' ');
		const [ result ] = await db.select().from(schema.buckets).where(eq(schema.buckets.accessKey, accessKey));
		if(typeof result !== 'object') return res.sendStatus(403); // Don't go further
		const source = JSON.parse(result.source);
		const cacheParams = JSON.parse(result.cache);
		if(typeof source !== 'object' || source.provider !== 'GitHub' || typeof source.params !== 'object') throw new Error('Unable to get source. Configure again.');
		if(typeof cacheParams !== 'object') throw new Error('Unable to get cache params. Configure again.');
		const bucket = Bucket().load({
			...(req.acceptsLanguages()[0] !== '*') ? { locale: req.acceptsLanguages(locales) } : {},
			source: GitHub(source.params),
		});
		bucket.initCache(BucketCache({
			dbPath: path.join(process.env.CACHE_PATH, result.id + '.sqlite'),
			...cacheParams
		}));
		const manifest = await bucket.manifest();
		const handler = createHandler({ 
			schema: graphQLSchema({ bucket, manifest }),
		});
		return handler(req, res);
	}
	return {
		handle
	}
}