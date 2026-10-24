const { Prisma } = require('@prisma/client');
const AppError = require('../errors/AppError');

// Formato único de erro da API: { codigo, mensagem, detalhes? }.
// Nunca inclui stack trace, caminhos de arquivo, SQL ou nomes de colunas.
function enviarErro(res, status, mensagem, { codigo, detalhes } = {}) {
  const corpo = { codigo: codigo ?? AppError.CODIGOS[status] ?? 'ERRO', mensagem };
  if (detalhes) corpo.detalhes = detalhes;
  return res.status(status).json(corpo);
}

// Erros do body-parser (express.json) que viram 4xx com mensagem fixa.
const ERROS_DE_CORPO = {
  'entity.parse.failed': [400, 'JSON_MALFORMADO', 'Corpo da requisição não é um JSON válido'],
  'entity.too.large': [413, null, 'Corpo da requisição excede o tamanho permitido'],
  'encoding.unsupported': [415, null, 'Codificação do corpo não suportada'],
  'charset.unsupported': [415, null, 'Charset do corpo não suportado'],
};

function notFound(req, res, next) {
  next(AppError.notFound('Rota não encontrada'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return enviarErro(res, err.statusCode, err.message, { codigo: err.codigo, detalhes: err.details });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return enviarErro(res, 409, 'Registro duplicado');
    if (err.code === 'P2025') return enviarErro(res, 404, 'Recurso não encontrado');
  }

  if (ERROS_DE_CORPO[err.type]) {
    const [status, codigo, mensagem] = ERROS_DE_CORPO[err.type];
    return enviarErro(res, status, mensagem, { codigo });
  }

  // Qualquer outro 4xx vindo de bibliotecas: status preservado, mensagem genérica.
  const status = err.status ?? err.statusCode;
  if (status >= 400 && status < 500) {
    return enviarErro(res, status, 'Requisição inválida');
  }

  // Detalhes só no log do servidor, nunca na resposta.
  console.error(err);
  return enviarErro(res, 500, 'Erro interno do servidor');
}

module.exports = { notFound, errorHandler };
