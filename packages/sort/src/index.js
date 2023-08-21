export const _asc = (a, b) => {
	if(a == b) return 0;
	const sorters = {
		string: () => a.localeCompare(b),
		number: () => (a - b),
	}
	return sorters[(typeof a)]();
}

export const _desc = (a, b) => {
	if(a == b) return 0;
	const sorters = {
		string: () => b.localeCompare(a),
		number: () => (b - a),
	}
	return sorters[(typeof a)]();
}