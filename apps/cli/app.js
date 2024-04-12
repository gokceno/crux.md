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
  .option('-l --locale <locale>', 'Locale, required.')
  .action(async (name, options) => {
    
    const bucket = Bucket().load({
      locale: options.opts().locale,
      source: FileSystem({ bucketPath: options.opts().path }),
    });

    bucket.initCache(BucketCache({
      dbPath: options.opts().outfile,
      expires: '-1 SECONDS',
    }));
    
    const manifest = await bucket.manifest();
    const select = bucket.select({ collection: 'services' }).expand({ children: 'services/title' });
    const results = await select.fetch({ manifest });
    if(results.length > 0) {
      console.log(`Succesfully hydrated ${results.length} entities.`);
    }
    else {
      console.error('No records were processed.')
    }
  });

program.parse(process.argv);