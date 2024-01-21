import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';

export const FileSystem = ({ bucketPath }) => {
  const _defaultFileExtension = 'md';
  const _root = [(bucketPath || './')];
  const open = async({ filename }) => {
    try {
      return await fs.readFile(path.join(..._root, filename), 'utf8');
    }
    catch(e) {
      console.error(e);
      throw new Error('File open error.');
    }
  }
  const list = async ({ collection, locale, omitBody = true }) => {
    try {
      if(locale !== undefined) _root.push(locale);
      const filenames = await fs.readdir(path.join(..._root, 'collections', collection));
      const filteredFiles = filenames.filter(filename => filename.split('.')[1] === _defaultFileExtension);
      const filePromises = filteredFiles.map(async (filename) => {
        const file = await open({ filename: path.join((locale ?? ''), 'collections', collection, filename) });
        if(file === undefined) {
          throw new Error('Failed to get file contents or types got mixed up.');
        }
        return {
          _id: filename,
          _slug: filename,
          _filename: filename,
          ..._extractFrontMatter(file),
          ...(omitBody === false ? _extractBody(file) : { _body: null }),
        }
      });
      return await Promise.all(filePromises);
    } 
    catch (e) {
      console.error(e);
      throw new Error('One or more paths not found.');
    }
  }
  const get = async({ filename, locale }) => {
    let file;
    if(locale !== undefined) _root.push(locale);
    file = await open({ filename: path.join('singles', [filename, _defaultFileExtension].join('.')) });
    return {
      _id: filename,
      _slug: filename,
      _filename: filename,
      ..._extractFrontMatter(file),
      ..._extractBody(file),
    }
  }
  const _extractBody = (file) => {
    const body = file.split('---')[2];
    if(body === undefined) throw new Error('Can not extract body, file may be formatted incorrectly.');
    return { body };
  }
  const _extractFrontMatter = (file) => {
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
    return YAML.parse(match.replaceAll('---', ''));
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