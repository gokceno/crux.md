import { createHandler } from 'graphql-http/lib/use/express';
import { schema as graphQLSchema } from '@gokceno/crux-graphql-schema';
import { Bucket } from '@gokceno/crux-bucket';
import { Cache as BucketCache } from '@gokceno/crux-bucket-cache-libsql';
import { GitHub } from '@gokceno/crux-bucket-source-github';
import { locales } from '@gokceno/crux-locales';

export const Router = ({ db, schema }) => {
	const handle = async(req, res) => {
		// const result = await db.select().from(schema.buckets);
		const bucket = Bucket().load({
			...(req.acceptsLanguages()[0] !== '*') ? { locale: req.acceptsLanguages(locales) } : {},
			source: GitHub({
				owner: 'BrewInteractive',
				repo: 'ks-kocsistem-web-2024',
				basePath: 'apps/api/.bucket',
				auth: process.env.GITHUB_TOKEN,
			})
		});
		bucket.initCache(BucketCache({
			dbPath: '../../samples/bucket/.cache.sqlite', // Use :memory: only if defined global otherwise it's useless as it recreates cache on every request.
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