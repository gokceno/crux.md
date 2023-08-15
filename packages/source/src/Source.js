import fs from 'fs/promises'
import path from 'path';
import YAML from 'yaml';

export const Source = () => {
  const FileSystem = ({ bucketPath }) => {
    const _defaultFileExtension = 'md';
    const _root = bucketPath || './';
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
        const frontmatter = await _extractFrontMatter({ filename: filename + '.md' });
        return {
          ...YAML.parse(frontmatter)
        }
      } catch (e) {
        console.error(e);
        return {};
      }
    }
    const _extractFrontMatter = async ({ collection, filename }) => {
      let file;
      if(collection !== undefined) {
        file = await fs.readFile(path.join(_root, 'collections', collection, filename), 'utf-8');
      }
      if(collection === undefined) {
        file = await fs.readFile(path.join(_root, 'singles', filename), 'utf-8');
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
      list,
      get,
    }
  }
  return { FileSystem }
}