import path from 'path';
import YAML from 'yaml';
import { Octokit, RequestError } from "octokit";

export const GitHub = ({ owner, repo, basePath = '', auth, headers = { 'X-GitHub-Api-Version': '2022-11-28' } }) => {
  const _defaultFileExtension = 'md';
  const _octokit = new Octokit({ auth });
  const open = async({ filename }) => {
    try {
      const response = await _octokit.request(`GET /repos/${owner}/${repo}/contents/${path.join(basePath, filename)}`, {
        owner,
        repo,
        path: path.join(basePath, filename),
        headers
      });
      return Buffer.from(response?.data?.content, 'base64').toString();
    }
    catch (e) {
      console.error(e);
      if (e instanceof RequestError) throw new Error('GitHub request error, possibly file is not found.');
      throw new Error('File open error.');
    }
  }
  const list = async ({ collection, locale, omitBody = true }) => {
    let finalPath = [basePath];
    if(locale !== undefined) finalPath.push(locale);
    finalPath.push('collections', collection);
    try {
      const response = await _octokit.request(`GET /repos/${owner}/${repo}/contents/${path.join(...finalPath)}`, {
        owner,
        repo,
        path: path.join(...finalPath),
        headers
      });
      const promises = response?.data?.filter(d => d.name.split('.')[1] === _defaultFileExtension).map(async (file) => {
        const fileContents = await open({ filename: path.join((locale ?? ''), 'collections', collection, file.name) });
        return {
          _id: file.name,
          _slug: file.name,
          _filename: file.name,
          ..._extractFrontMatter(fileContents),
          ...(omitBody === false ? _extractBody(fileContents) : { body: null }),
        }
      });
      return await Promise.all(promises);
    }
    catch (e) {
      console.error(e);
      if (e instanceof RequestError) throw new Error('GitHub request error, possibly path is not found.');
      throw new Error('Generic error.');
    }
  }
  const get = async({ filename, locale }) => {
    let finalPath = ['singles', [filename, _defaultFileExtension].join('.')];
    if(locale !== undefined) finalPath.unshift(locale);
    const fileContents = await open({ filename: path.join(...finalPath) });
    return {
      _id: filename,
      _slug: filename,
      _filename: filename,
      ..._extractFrontMatter(fileContents),
      ..._extractBody(fileContents),
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