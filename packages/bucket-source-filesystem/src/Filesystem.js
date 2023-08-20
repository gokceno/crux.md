import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';

export const FileSystem = ({ bucketPath }) => {
  const _defaultFileExtension = 'md';
  const _root = bucketPath || './';
  const open = async({ filename }) => await fs.readFile(path.join(_root, filename), 'utf8');
  const list = async ({ collection }) => {
    try {
      const filenames = await fs.readdir(path.join(_root, 'collections', collection));
      const filteredFiles = filenames.filter(filename => filename.split('.')[1] === _defaultFileExtension);
      const filePromises = filteredFiles.map(async (filename) => {
        try {
          const frontmatter = await _extractFrontMatter({ collection, filename });
          return {
            ...YAML.parse(frontmatter)
          }
        } catch (e) {
          console.error(e);
          return {};
        }
      });
      return await Promise.all(filePromises);
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  const get = async({ filename }) => {
    try {
      const frontmatter = await _extractFrontMatter({ filename: [filename, _defaultFileExtension].join('.') });
      return {
        ...YAML.parse(frontmatter)
      }
    } catch (e) {
      console.error(e);
      return {};
    }
  }
  const _extractFrontMatter = async ({ collection, filename }) => {
      // TODO: Move file opens to parent.
    let file;
    if(collection !== undefined) {
      file = await open({ filename: path.join('collections', collection, filename) });
    }
    if(collection === undefined) {
      file = await open({ filename: path.join('singles', filename) });
    }
    if(file === undefined) {
      throw new Error('Failed to get file contents or types got mixed up.');
    }
      // via and thanks to: https://github.com/jxson/front-matter/blob/master/index.js
    const pattern = '^(' +
    '\\ufeff?' +
    '(= yaml =|---)' +
    '$([\\s\\S]*?)' +
    '^(?:\\2|\\.\\.\\.)\\s*' +
    '$' +
    '(?:\\n)?)'
    const regex = new RegExp(pattern, 'm');
    const [ match ] = regex.exec(file);
    if(match == undefined) throw new Error('Can not extract frontmatter, file may be formatted incorrectly.');
    return match.replaceAll('---', '');
  }
  return {
    isFiltered: false,
    isOrdered: false,
    isExpanded: false,
    list,
    get,
    open,
  }
}