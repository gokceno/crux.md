export const Cache = ({}) => {
  const populate = ({ data }) => {
    return data;
  };
  const get = ({}) => {
    return {};
  };
  const isCached = ({}) => {
    return false;
  };
  return {
    populate,
    get,
    isCached,
  };
};
