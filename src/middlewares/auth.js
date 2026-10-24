const AppError = require('../errors/AppError');
const authService = require('../services/AuthService');

async function auth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw AppError.unauthorized('Token ausente');
  }

  req.user = await authService.usuarioAutenticado(token);
  next();
}

module.exports = auth;
