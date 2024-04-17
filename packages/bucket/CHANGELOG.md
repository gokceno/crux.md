# @gokceno/crux-bucket

## 1.3.1

### Patch Changes

- Fixed "to few records to offset" error during pagination

## 1.3.0

### Minor Changes

- Moved filtering from cache-\* to buckets; CRUX will now use JS filter methods to query results instead of SQLite. Although this reduces performance, the code will be more maintainable. Trade off.

## 1.2.1

### Patch Changes

- Fixed an issue causing expansions in sub-components not caching properly.
- 92a1dd6: Fixed an issue causing records to be filtered by only the last criteria instead of all critera.

## 1.2.0

### Minor Changes

- Implemented locale based folder/file scanning.

## 1.1.6

### Patch Changes

- Fixed an issue causing filters returning null results from cached items.

## 1.1.5

### Patch Changes

- Fixed an issue with pagination.

## 1.1.4

### Patch Changes

- Fixed an issue causing nested objects not being output and cached correctly.

## 1.1.3

### Patch Changes

- Fixed issues with caching of singles and their props.

## 1.1.2

### Patch Changes

- Fixed an issue with maximum depth settings.

## 1.1.1

### Patch Changes

- 73df7ee: Fixed an issue preventing "singles" drawing expansions in sub-components.

## 1.1.0

### Minor Changes

- 03090c7: Increased expansion depth level to 2 (used to expand only the first level).

## 1.0.1

### Patch Changes

- Ability to expand within sub-components root.

## 1.0.0

### Major Changes

- New YAML format in manifest.yml

## 0.3.0

### Minor Changes

- fab043c: Buckets now cache based on locale as well.

## 0.2.0

### Minor Changes

- 84d02d5: Ability to cache singles
- c611b23: Added locale selection based on accept headers.

## 0.1.2

### Patch Changes

- Fixed expansions not working consistently.

## 0.1.1

### Patch Changes

- Added missing dependency

## 0.1.0

### Minor Changes

- Added ability to cache manifests

## 0.0.1

### Patch Changes

- Init Changesets
- Updated dependencies
  - @gokceno/crux-sort@0.0.1
  - @gokceno/crux-typof@0.0.1
