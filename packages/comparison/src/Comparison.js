export const _eq = (iValue, cValue) => iValue == cValue;
export const _neq = (iValue, cValue) => iValue != cValue;
export const _null = (iValue, cValue) => iValue === null || iValue === undefined || iValue.length === 0;
export const _nnull = (iValue, cValue) => iValue !== null && iValue !== undefined && iValue.length !== 0;
export const _gte = (iValue, cValue) => +iValue >= +cValue;
export const _lte = (iValue, cValue) => +iValue <= +cValue;
export const _gt = (iValue, cValue) => +iValue > +cValue;
export const _lt = (iValue, cValue) => +iValue < +cValue;