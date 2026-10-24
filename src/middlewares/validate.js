const AppError = require('../errors/AppError');

function detalheDoProblema(issue) {
  // Campo não permitido (schemas estritos): informa qual foi, sem ecoar o valor enviado.
  if (issue.code === 'unrecognized_keys') {
    return { campo: issue.keys.join(', '), mensagem: 'Campo não permitido' };
  }
  return { campo: issue.path.join('.'), mensagem: issue.message };
}

// Valida req[source] com um schema zod e substitui pelo valor já convertido.
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      throw AppError.unprocessable('Dados inválidos', result.error.issues.map(detalheDoProblema));
    }
    // Express 5: req.query é somente leitura, então guardamos em req.validated
    req.validated = { ...req.validated, [source]: result.data };
    next();
  };
}

module.exports = validate;
