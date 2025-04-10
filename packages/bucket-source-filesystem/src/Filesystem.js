import fs from "fs/promises";
import path from "path";
import YAML from "yaml";
import slugify from "@sindresorhus/slugify";
import { constructPath } from "@gokceno/crux-utils";

export const FileSystem = ({ bucketPath }) => {
  const _defaultFileExtension = "md";
  const _root = bucketPath || "./";
  const _slugifyReplacements = [["&", ""]];
  const open = async (filename) => {
    try {
      return await fs.readFile(path.join(_root, filename), "utf8");
    } catch (e) {
      console.error(e);
      throw new Error("File open error.");
    }
  };
  const list = async ({ collection, locale, omitBody = true }) => {
    try {
      const filenames = await fs.readdir(
        constructPath({ root: _root, collection, locale })
      );
      const filteredFiles = filenames.filter(
        (filename) => filename.split(".")[1] === _defaultFileExtension
      );
      const filePromises = filteredFiles.map(async (filename) => {
        const file = await open(
          constructPath({ locale, collection, filename })
        );
        if (file === undefined) {
          throw new Error("Failed to get file contents or types got mixed up.");
        }
        const frontMatter = _extractFrontMatter(file);
        return {
          _id: slugify(filename.replace("." + _defaultFileExtension, ""), {
            customReplacements: _slugifyReplacements,
            decamelize: false,
          }),
          _slug: slugify(frontMatter.title || "", {
            customReplacements: _slugifyReplacements,
            decamelize: false,
          }),
          _filename: filename.replace("." + _defaultFileExtension, ""),
          ...frontMatter,
          ...(omitBody === false ? _extractBody(file) : { _body: null }),
        };
      });
      return await Promise.all(filePromises);
    } catch (e) {
      console.error(e);
      throw new Error("One or more paths not found.");
    }
  };
  const get = async ({ single, locale }) => {
    let file = await open(constructPath({ locale, single }));
    const frontMatter = _extractFrontMatter(file);
    return {
      _id: slugify(single, {
        customReplacements: _slugifyReplacements,
        decamelize: false,
      }),
      _slug: slugify(frontMatter.title || "", {
        customReplacements: _slugifyReplacements,
        decamelize: false,
      }),
      _filename: single,
      ...frontMatter,
      ..._extractBody(file),
    };
  };
  const _extractBody = (file) => {
    const body = file.split("---")[2];
    if (body === undefined)
      throw new Error(
        "Can not extract body, file may be formatted incorrectly."
      );
    return { _body: body };
  };
  const _extractFrontMatter = (file) => {
    // via and thanks to: https://github.com/jxson/front-matter/blob/master/index.js
    const pattern =
      "^(" +
      "\\ufeff?" +
      "(= yaml =|---)" +
      "$([\\s\\S]*?)" +
      "^(?:\\2|\\.\\.\\.)\\s*" +
      "$" +
      "(?:\\n)?)";
    const regex = new RegExp(pattern, "m");
    const matches = regex.exec(file);
    if (!matches || !matches[Symbol.iterator]) {
      throw new Error(
        "Can not extract frontmatter, file may be formatted incorrectly."
      );
    }
    return YAML.parse(matches[0].replaceAll("---", ""));
  };
  return {
    isFiltered: false,
    isOrdered: false,
    isExpanded: false,
    list,
    get,
    open,
  };
};
