import { Command } from "commander";
import { Bucket } from "@gokceno/crux-bucket";
import { Cache as BucketCache } from "@gokceno/crux-bucket-cache-libsql";
import { Cache as NullCache } from "@gokceno/crux-bucket-cache-null";
import { FileSystem } from "@gokceno/crux-bucket-source-filesystem";

import { ChatOpenAI } from "@langchain/openai";
import { LibSQLVectorStore } from "@langchain/community/vectorstores/libsql";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@libsql/client";

const hydrate = async (name, options) => {
  const bucket = new Bucket().load({
    ...(options.opts().locale !== undefined
      ? { locale: options.opts().locale }
      : {}),
    source: new FileSystem({ bucketPath: options.opts().path }),
  });
  bucket.initCache(new NullCache({}));

  const _createVectorTables = async (db) => {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS vectors (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, metadata TEXT, embeddings F32_BLOB(1536))`
    );
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_vectors_embeddings ON vectors(libsql_vector_idx(embeddings))`
    );
  };
  const db = createClient({
    url: `file:${options.opts().dburl}`,
  });
  await _createVectorTables(db);

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const vectorStore = new LibSQLVectorStore(embeddings, {
    db,
    table: "vectors",
    column: "embeddings",
  });

  const manifest = await bucket.manifest();
  manifest.collections.map(async (collection) => {
    const [collectionName] = Object.keys(collection);
    try {
      const select = bucket.select({ collection: collectionName });
      const fetch = await select.fetch({ manifest, omitBody: false });
      fetch.map(async (document) => {
        try {
          await vectorStore.addDocuments([
            {
              pageContent: document._body,
              metadata: { collection: collectionName },
            },
          ]);
        } catch (e) {
          console.error(e);
        }
      });
    } catch (e) {
      console.error(e);
    }
  });
};
export { hydrate };
