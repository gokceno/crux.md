import path from 'path';
import YAML from 'yaml';
import { Octokit } from "octokit";

export const GitHub = ({ owner, repo, basePath = '', auth, headers = { 'X-GitHub-Api-Version': '2022-11-28' } }) => {
  const _defaultFileExtension = 'md';
  const _octokit = new Octokit({ auth });
  const open = async({ filename }) => {
    const response = await _octokit.request(`GET /repos/${owner}/${repo}/contents/${path.join(basePath, filename)}`, {
      owner,
      repo,
      path: path.join(basePath, filename),
      headers
    });
    return Buffer.from(response?.data?.content, 'base64').toString();
  }
  const list = async ({ collection, omitBody = true }) => {
    const finalPath = path.join(basePath, 'collections', collection);
    const response = await _octokit.request(`GET /repos/${owner}/${repo}/contents/${finalPath}`, {
      owner,
      repo,
      path: finalPath,
      headers
    });
    const promises = response?.data?.filter(d => d.name.split('.')[1] === _defaultFileExtension).map(async (file) => {
      const fileContents = await open({ filename: path.join('collections', collection, file.name) });
      return {
        id: file.name,
        slug: file.name,
        ..._extractFrontMatter(fileContents),
        ...(omitBody === false ? _extractBody(fileContents) : { body: null }),
      }
    });
    return await Promise.all(promises);
  }
  const get = async({ filename }) => {
    const fileContents = await open({ filename: path.join('singles', [filename, _defaultFileExtension].join('.')) });
    return {
      id: filename,
      slug: filename,
      ..._extractFrontMatter(fileContents),
      ..._extractBody(fileContents),
    }
  }
  const _extractBody = (file) => {
    return { body: file.split('---')[2] || null };
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