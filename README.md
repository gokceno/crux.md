# crux.md

Crux is an open-source, headless data platform that exposes your data stored in future-proof text (markdown and YAML) files to the public. It offers two types of data gateways: programmatic and semantic (WIP).

Programmatic gateway gives you GraphQL endpoints to "query" your markdown/YAML data against a schema, while semantic gateway (WIP) allows you to interact with your data simply by running predefined commands.

# Using Crux

## Content Preparation

Please see the files in the `sample/bucket` directory for examples on how to structure your content.

# Development

## Releasing

To release a new version of Crux, you need to follow these steps:

* Run `yarn changesets` to create a new changeset. You're free to commit now.
* Run `yarn changeset version` when your changes are ready to be released. This command will bump the version of the package and update all dependent packages accordingly.
