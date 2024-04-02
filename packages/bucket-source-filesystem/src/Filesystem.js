import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';
import slugify from '@sindresorhus/slugify'

export const FileSystem = ({ bucketPath }) => {
  const _defaultFileExtension = 'md';
  const _root = bucketPath || './';
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
    ['&', ''],
  ];
  const open = async(filename) => {
    try {
      return await fs.readFile(path.join(_root, filename), 'utf8');
    }
    catch(e) {
      console.error(e);
      throw new Error('File open error.');
    }
  }
  const list = async ({ collection, locale, omitBody = true }) => {
    try {
      const filenames = await fs.readdir(
        _constructPath({ root: _root, collection, locale })
      );
      const filteredFiles = filenames.filter(filename => filename.split('.')[1] === _defaultFileExtension);
      const filePromises = filteredFiles.map(async (filename) => {
        const file = await open(
          _constructPath({ locale, collection, filename })
        );
        if(file === undefined) {
          throw new Error('Failed to get file contents or types got mixed up.');
        }
        const frontMatter = _extractFrontMatter(file);
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
  const get = async({ single, locale }) => {
    let file = await open(
      _constructPath({ locale, single })
    );
    const frontMatter = _extractFrontMatter(file);
    return {
      _id: slugify(single, { customReplacements: _slugifyReplacements, decamelize: false }),
      _slug: slugify(frontMatter.title || '', { customReplacements: _slugifyReplacements, decamelize: false }),
      ...frontMatter,
      ..._extractBody(file),
    }
  }
  const _constructPath = ({ root, collection, single, filename, locale }) => {
    let language, country;
    if(locale !== undefined) {
      // eslint-disable-next-line no-unused-vars
      [language, country] = locale.split('-');
    }
    let fragments = [];
    if(root !== undefined) fragments.push(root);
    if(collection !== undefined) {
      fragments.push('collections', collection);
      if(language) fragments.push(language);
      if(filename !== undefined) fragments.push(filename);
    }
    else if(single !== undefined) {
      fragments.push('singles');
      if(language) fragments.push(language);
      fragments.push([single, _defaultFileExtension].join('.'));
    }
    else {
      throw new Error('Misformed file path.')
    }
    return path.join(...fragments);
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