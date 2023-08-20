export const _eq = (a, b) => a == b;
export const _neq = (a, b) => a != b;
export const _null = (a, b) => a === null || a === undefined || a.length === 0;
export const _nnull = (a, b) => a !== null && a !== undefined && a.length !== 0;
export const _gte = (a, b) => +a >= +b;
export const _lte = (a, b) => +a <= +b;
export const _gt = (a, b) => +a > +b;
export const _lt = (a, b) => +a < +b;