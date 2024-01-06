import { DateTime } from 'luxon';

export const string = () => {
	const _eq = (a, b) => a == b;
	const _neq = (a, b) => a != b;
	const _null = (a) => a === null || a === undefined || a.length === 0;
	const _nnull = (a) => a !== null && a !== undefined && a.length !== 0
	return {
		_eq,
		_neq,
		_null,
		_nnull,
	}
}
export const boolean = () => {
	const _eq = (a, b) => a == b;
	const _neq = (a, b) => a != b;
	const _null = (a) => a === null || a === undefined || a.length === 0;
	const _nnull = (a) => a !== null && a !== undefined && a.length !== 0
	return {
		_eq,
		_neq,
		_null,
		_nnull,
	}
}
export const number = () => {
	const _eq = (a, b) => +a == +b;
	const _neq = (a, b) => +a != +b;
	const _gte = (a, b) => +a >= +b;
	const _lte = (a, b) => +a <= +b;
	const _gt = (a, b) => +a > +b;
	const _lt = (a, b) => +a < +b;
	return {
		_eq,
		_neq,
		_gte,
		_lte,
		_lt,
		_gt,
	}
}
export const date = () => {
	const _eq = (a, b) => DateTime.fromISO(a).toISODate() == DateTime.fromISO(b).toISODate();
	const _neq = (a, b) => DateTime.fromISO(a).toISODate() != DateTime.fromISO(b).toISODate();
	const _gte = (a, b) => DateTime.fromISO(a) >= DateTime.fromISO(b);
	const _lte = (a, b) => DateTime.fromISO(a) <= DateTime.fromISO(b);
	const _gt = (a, b) => DateTime.fromISO(a) > DateTime.fromISO(b);
	const _lt = (a, b) => DateTime.fromISO(a) < DateTime.fromISO(b);
	return {
		_eq,
		_neq,
		_gte,
		_lte,
		_lt,
		_gt,
	}
}