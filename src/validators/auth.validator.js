const { z } = require('zod');
const { createUsuarioSchema } = require('./usuario.validator');

const registerSchema = createUsuarioSchema;

const loginSchema = z.strictObject({
  email: z.email().toLowerCase(),
  senha: z.string().min(1).max(72),
});

module.exports = { registerSchema, loginSchema };
