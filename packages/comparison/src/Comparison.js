export const Comparison = () => {
  const _eq = (iValue, cValue) => iValue == cValue;
  const _neq = (iValue, cValue) => iValue != cValue;
  const _null = (iValue, cValue) => iValue === null || iValue === undefined || iValue.length === 0;
  const _nnull = (iValue, cValue) => iValue !== null && iValue !== undefined && iValue.length !== 0;
  const _gte = (iValue, cValue) => +iValue >= +cValue;
  const _lte = (iValue, cValue) => +iValue <= +cValue;
  const _gt = (iValue, cValue) => +iValue > +cValue;
  const _lt = (iValue, cValue) => +iValue < +cValue;
  return {
    _eq,
    _neq,
    _null,
    _nnull,
    _gte,
    _lte,
    _lt,
    _gt,
  }
}