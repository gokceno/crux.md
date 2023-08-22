import { DateTime } from 'luxon';
import { typof } from '@crux/typof';

export const asc = (a, b) => {
	if(a == b) return 0;
	const sorters = {
		string: () => a.localeCompare(b),
		number: () => (a - b),
		date: () => DateTime.fromISO(a).toUnixInteger() - DateTime.fromISO(b).toUnixInteger(),
	}
	// TODO: type check for missing sorters
	return sorters[typof(a)]();
}

export const desc = (a, b) => {
	if(a == b) return 0;
	const sorters = {
		string: () => b.localeCompare(a),
		number: () => (b - a),
		date: () => DateTime.fromISO(b).toUnixInteger() - DateTime.fromISO(a).toUnixInteger(),
	}
	// TODO: type check for missing sorters
	return sorters[typof(a)]();
}