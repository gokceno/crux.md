export const typof = (v) => {
  if(typeof v === 'string') {
    return new Date(v) > 0 ? 'date' : 'string';
  }
  return typeof v;
}