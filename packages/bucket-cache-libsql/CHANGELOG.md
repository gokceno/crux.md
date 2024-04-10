# @gokceno/crux-bucket-cache-libsql

## 0.4.1

### Patch Changes

- Fixed an issue from previous release: Replaced a check within SQL with a try-catch (not so elegant). Will change later.

## 0.4.0

### Minor Changes

- Moved filtering from cache-\* to buckets; CRUX will now use JS filter methods to query results instead of SQLite. Although this reduces performance, the code will be more maintainable. Trade off.

## 0.3.12

### Patch Changes

- Fixed an issue that causes duplicate content in collections.

## 0.3.11

### Patch Changes

- Fixed an issue causing expansions in sub-components not caching properly.

## 0.3.10

### Patch Changes

- Fixed an issue causing filtering \_id and \_slug errors.

## 0.3.9

### Patch Changes

- Rolled back changes.

## 0.3.8

### Patch Changes

- Fixed an issue causing filters returning null results from cached items.

## 0.3.7

### Patch Changes

- Fixed an issue which flushes the cache right after caching the value.

## 0.3.6

### Patch Changes

- Fixed an issue causing nested objects not being output and cached correctly.

## 0.3.5

### Patch Changes

- Removed dependency for the manifest.

## 0.3.4

### Patch Changes

- Fixed issues with caching of singles and their props.

## 0.3.3

### Patch Changes

- Fixed issues with caching of singles and their props.

## 0.3.2

### Patch Changes

- 73df7ee: Fixed an issue preventing "singles" drawing expansions in sub-components.

## 0.3.1

### Patch Changes

- 4208c72: Fixed caching collections with expandable properties.

## 0.3.0

### Minor Changes

- e2de267: Cache now accepts locale for multilingual caching.

## 0.2.0

### Minor Changes

- 84d02d5: Ability to cache singles

### Patch Changes

- 07a219e: Moved manual initialization of cache tables SQL statements.

## 0.1.0

### Minor Changes

- Added ability to cache manifests

## 0.0.2

### Patch Changes

- Fixed libsql cache ordering, refactor.

## 0.0.1

### Patch Changes

- Init Changesets
