const { z } = require('zod');

const STATUS = ['DISPONIVEL', 'EMPRESTADO', 'MANUTENCAO'];

// Corpos usam strictObject: campo desconhecido gera 422 em vez de ser descartado em silêncio.
const createEquipamentoSchema = z.strictObject({
  patrimonio: z.string().trim().min(1).max(50),
  descricao: z.string().trim().min(2).max(255),
  categoria: z.string().trim().min(2).max(60),
});

// EMPRESTADO só é definido pelo fluxo de empréstimo, nunca manualmente.
const updateEquipamentoSchema = createEquipamentoSchema
  .extend({ status: z.enum(['DISPONIVEL', 'MANUTENCAO']) })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo' });

const listEquipamentoQuerySchema = z.object({
  status: z.enum(STATUS).optional(),
  categoria: z.string().trim().min(1).optional(),
  busca: z.string().trim().min(1).optional(), // procura em patrimônio ou descrição
});

module.exports = {
  STATUS,
  createEquipamentoSchema,
  updateEquipamentoSchema,
  listEquipamentoQuerySchema,
};
