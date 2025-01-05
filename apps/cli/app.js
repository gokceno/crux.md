import { Command } from "commander";
import { Bucket } from "@gokceno/crux-bucket";
import { Cache as BucketCache } from "@gokceno/crux-bucket-cache-libsql";
import { Cache as NullCache } from "@gokceno/crux-bucket-cache-null";
import { FileSystem } from "@gokceno/crux-bucket-source-filesystem";

import { ChatOpenAI } from "@langchain/openai";
import { LibSQLVectorStore } from "@langchain/community/vectorstores/libsql";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@libsql/client";

import { hydrate } from "./src/vectors/hydrate.js";

const program = new Command();

// TODO: Move to separate files: https://github.com/tj/commander.js/blob/HEAD/examples/nestedCommands.js
const cache = program.command("cache");
const vectors = program.command("vectors");

vectors
  .command("hydrate")
  .requiredOption("-p --path <path>", 'Path to bucket, default: ".", required.')
  .requiredOption(
    "-u --dburl <path>",
    "Path to SQLite DB for storing vectors, required."
  )
  .action(async (name, options) => {
    const bucket = Bucket().load({
      ...(options.opts().locale !== undefined
        ? { locale: options.opts().locale }
        : {}),
      source: FileSystem({ bucketPath: options.opts().path }),
    });
    bucket.initCache(NullCache({}));

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
  });

vectors
  .command("chat")
  .requiredOption("-m --message <message>", "Your message, required.")
  .requiredOption(
    "-u --dburl <path>",
    "Path to SQLite DB for storing vectors, required."
  )
  .action(async (name, options) => {
    const db = createClient({
      url: `file:${options.opts().dburl}`,
    });

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const vectorStore = new LibSQLVectorStore(embeddings, {
      db,
      table: "vectors",
      column: "embeddings",
    });

    const retriever = vectorStore.asRetriever(1);
    const retrievedDocuments = await retriever.invoke(options.opts().message);

    const openAIModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
      modelName: "gpt-3.5-turbo",
    });
    const content = `
      Context:
      ${retrievedDocuments[0]["pageContent"]}

      Question:
      ${options.opts().message}
    `;
    const response = await openAIModel.invoke([
      {
        role: "system",
        content:
          "You are a helpful assistant. Remain strictly within the context. Do not use any external sources. If you cannot answer say 'n/a'.",
      },
      {
        role: "user",
        content,
      },
    ]);
    console.log(response.content);
  });

cache
  .command("hydrate")
  .requiredOption("-p --path <path>", 'Path to bucket, default: ".", required.')
  .requiredOption(
    "-o --outfile <path>",
    "Path to cache file (SQLite), required."
  )
  .option("-l --locale <locale>", "Locale, optional.")
  .option("-e --expires <expires>", "Locale, optional.")
  .action(async (name, options) => {
    const bucket = Bucket().load({
      ...(options.opts().locale !== undefined
        ? { locale: options.opts().locale }
        : {}),
      source: FileSystem({ bucketPath: options.opts().path }),
    });

    bucket.initCache(
      BucketCache({
        ...(options.opts().expires !== undefined
          ? { expires: options.opts().expires }
          : {}),
        dbPath: options.opts().outfile,
      })
    );

    const manifest = await bucket.manifest();
    manifest.collections.map(async (collection) => {
      const [collectionName] = Object.keys(collection);
      try {
        const select = bucket.select({ collection: collectionName });
        Object.entries(collection[collectionName])
          // eslint-disable-next-line no-unused-vars
          .filter(
            ([fieldName, fieldValue]) =>
              typeof fieldValue === "string" && fieldValue.indexOf("/") !== -1
          )
          .map(([fieldName, fieldValue]) =>
            select.expand({ [fieldName]: fieldValue })
          );
        await select.fetch({ manifest });
      } catch (e) {
        console.error(e);
      }
    });
  });

program.parse(process.argv);
