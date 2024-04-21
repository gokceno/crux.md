export const checkAuthorizationHeaders = async (req, res, next) => {
  const [type, token] = (req.headers['authorization'] || '').split(' ');
  if(type !== 'Bearer' || token === undefined) return res.sendStatus(403);
  else {
    next();
  }
}