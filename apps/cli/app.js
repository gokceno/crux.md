import { Command } from 'commander';
import { Bucket } from '@gokceno/crux-bucket';
import { Cache as BucketCache } from '@gokceno/crux-bucket-cache-libsql';
import { FileSystem } from '@gokceno/crux-bucket-source-filesystem';

const program = new Command();

// TODO: Move to separate files: https://github.com/tj/commander.js/blob/HEAD/examples/nestedCommands.js
const cache = program.command('cache');

cache
  .command('hydrate')
  .requiredOption('-p --path <path>', 'Path to bucket, default: ".", required.')
  .requiredOption('-o --outfile <path>', 'Path to cache file (SQLite), required.')
  .option('-l --locale <locale>', 'Locale, optional.')
  .option('-e --expires <expires>', 'Locale, optional.')
  .action(async (name, options) => {
    
    const bucket = Bucket().load({
      ...(options.opts().locale !== undefined) ? { locale: options.opts().locale } : {},
      source: FileSystem({ bucketPath: options.opts().path }),
    });
    
    bucket.initCache(BucketCache({
      ...(options.opts().expires !== undefined) ? { expires: options.opts().expires } : {},
      dbPath: options.opts().outfile,
    }));

    const manifest = await bucket.manifest();
    manifest.collections.map(async (collection) => {
      const [ collectionName ] = Object.keys(collection)
      try {
        const select = bucket.select({ collection: collectionName });
        Object.entries(collection[collectionName])
        // eslint-disable-next-line no-unused-vars
        .filter(([fieldName, fieldValue]) => typeof fieldValue === 'string' && fieldValue.indexOf('/') !== -1)
        .map(([fieldName, fieldValue]) => select.expand({ [fieldName]: fieldValue }));
        await select.fetch({ manifest });
      }
      catch(e) {
        console.error(e);
      }
    });
  });

program.parse(process.argv);