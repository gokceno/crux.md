import path from 'path';

export const constructPath = ({ root, collection, single, filename, locale, defaultFileExtension = 'md' }) => {
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
		fragments.push([single, defaultFileExtension].join('.'));
	}
	else if(collection === undefined && single === undefined && filename !== undefined) {
		fragments.push(filename);
	}
	else {
		throw new Error('Misformed file path.')
	}
	return path.join(...fragments);
}