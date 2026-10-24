// Código padrão de cada status HTTP; vai no campo "codigo" da resposta de erro.
const CODIGOS = {
  400: 'REQUISICAO_INVALIDA',
  401: 'NAO_AUTENTICADO',
  403: 'ACESSO_NEGADO',
  404: 'NAO_ENCONTRADO',
  409: 'CONFLITO',
  413: 'CORPO_MUITO_GRANDE',
  415: 'TIPO_NAO_SUPORTADO',
  422: 'DADOS_INVALIDOS',
  500: 'ERRO_INTERNO',
};

class AppError extends Error {
  constructor(message, statusCode = 400, { details, codigo } = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.codigo = codigo ?? CODIGOS[statusCode] ?? 'ERRO';
    this.details = details;
  }

  static badRequest(msg, details) { return new AppError(msg, 400, { details }); }
  static unauthorized(msg = 'Não autenticado') { return new AppError(msg, 401); }
  static forbidden(msg = 'Acesso negado') { return new AppError(msg, 403); }
  static notFound(msg = 'Recurso não encontrado') { return new AppError(msg, 404); }
  static conflict(msg) { return new AppError(msg, 409); }
  static unprocessable(msg, details) { return new AppError(msg, 422, { details }); }
}

AppError.CODIGOS = CODIGOS;

module.exports = AppError;
