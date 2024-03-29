import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';
import slugify from '@sindresorhus/slugify'

export const FileSystem = ({ bucketPath }) => {
  const _defaultFileExtension = 'md';
  const _root = [(bucketPath || './')];
  const _slugifyReplacements =  [
    ['ü', 'u'],
    ['Ü', 'u'],
    ['ö', 'o'],
    ['Ö', 'o'],
    ['ğ', 'g'],
    ['Ğ', 'g'],
    ['ş', 's'],
    ['Ş', 's'],
    ['ç', 'c'],
    ['Ç', 'c'],
  ];
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
      const filenames = await fs.readdir(path.join(..._root, (locale ?? ''), 'collections', collection));
      const filteredFiles = filenames.filter(filename => filename.split('.')[1] === _defaultFileExtension);
      const filePromises = filteredFiles.map(async (filename) => {
        const file = await open({ filename: path.join((locale ?? ''), 'collections', collection, filename) });
        const frontMatter = _extractFrontMatter(file);
        if(file === undefined) {
          throw new Error('Failed to get file contents or types got mixed up.');
        }
        return {
          _id: slugify(filename.replace('.' + _defaultFileExtension, ''), { customReplacements: _slugifyReplacements, decamelize: false }),
          _slug: slugify(frontMatter.title || '', { customReplacements: _slugifyReplacements, decamelize: false }),
          ...frontMatter,
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
    let file = await open({ filename: path.join((locale ?? ''), 'singles', [filename, _defaultFileExtension].join('.')) });
    const frontMatter = _extractFrontMatter(file);
    return {
      _id: slugify(filename.replace('.' + _defaultFileExtension, ''), { customReplacements: _slugifyReplacements, decamelize: false }),
      _slug: slugify(frontMatter.title || '', { customReplacements: _slugifyReplacements, decamelize: false }),
      ...frontMatter,
      ..._extractBody(file),
    }
  }
  const _extractBody = (file) => {
    const body = file.split('---')[2];
    if(body === undefined) throw new Error('Can not extract body, file may be formatted incorrectly.');
    return { _body: body };
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