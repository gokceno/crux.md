export const asc = (a, b) => {
	if(a == b) return 0;
	const sorters = {
		string: () => a.localeCompare(b),
		number: () => (a - b),
	}
	// TODO: type check for missing sorters
	return sorters[(typeof a)]();
}

export const desc = (a, b) => {
	if(a == b) return 0;
	const sorters = {
		string: () => b.localeCompare(a),
		number: () => (b - a),
	}
	// TODO: type check for missing sorters
	return sorters[(typeof a)]();
}