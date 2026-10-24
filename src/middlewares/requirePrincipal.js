const AppError = require('../errors/AppError');

// Uso: router.patch('/:id/permissao', requirePrincipal, handler)
function requirePrincipal(req, res, next) {
  if (!req.user) throw AppError.unauthorized();
  if (!req.user.principal) throw AppError.forbidden('Apenas o admin principal pode realizar esta ação');
  next();
}

module.exports = requirePrincipal;
