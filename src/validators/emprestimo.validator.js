const { z } = require('zod');
const { booleanQuery } = require('./common.validator');

const STATUS = ['SOLICITADO', 'REJEITADO', 'ATIVO', 'DEVOLUCAO_PENDENTE', 'DEVOLVIDO'];

// O prazo é fixo (7 dias a partir da aprovação), então só se escolhe o equipamento.
// "usuarioId" registra em nome de outra pessoa: só admin (o service recusa com 403
// para usuário comum). Estrito: qualquer outro campo gera 422.
const createEmprestimoSchema = z.strictObject({
  equipamentoId: z.coerce.number().int().positive(),
  usuarioId: z.coerce.number().int().positive().optional(),
});

const listEmprestimoQuerySchema = z.object({
  status: z.enum(STATUS).optional(),
  usuarioId: z.coerce.number().int().positive().optional(), // ignorado para usuário comum
  equipamentoId: z.coerce.number().int().positive().optional(),
  atrasados: booleanQuery.optional(),
});

module.exports = { STATUS, createEmprestimoSchema, listEmprestimoQuerySchema };
