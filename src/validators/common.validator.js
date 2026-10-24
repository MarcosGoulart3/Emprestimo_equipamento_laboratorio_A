const { z } = require('zod');

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Justificativa obrigatória (ex.: rejeitar um empréstimo).
const motivoSchema = z.strictObject({
  motivo: z.string().trim().min(3).max(255),
});

// Query strings chegam como texto; z.coerce.boolean() trataria "false" como true.
const booleanQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

module.exports = { idParamSchema, motivoSchema, booleanQuery };
