const { z } = require('zod');

const ROLES = ['usuario', 'admin'];
const STATUS = ['ATIVO', 'INATIVO'];

const nome = z.string().trim().min(2).max(120);
const email = z.email().toLowerCase();
const senha = z.string().min(6).max(72); // bcrypt ignora além de 72 bytes

// Corpos usam strictObject: mandar "role", "status" etc. onde não é permitido
// gera 422, em vez de o campo ser descartado em silêncio.

// Usado no autocadastro e no cadastro pelo admin. O papel não entra aqui:
// qualquer cadastro nasce "usuario" e só o admin principal concede "admin".
const createUsuarioSchema = z.strictObject({ nome, email, senha });

// Papel e status mudam só pelas rotas próprias (permissao, desativar, reativar).
const updateUsuarioSchema = z
  .strictObject({ nome, email, senha })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo' });

const permissaoSchema = z.strictObject({
  role: z.enum(ROLES),
});

// Próprio usuário editando o perfil: trocar e-mail ou senha exige a senha atual.
const updateMeSchema = z
  .strictObject({ nome, email, senha, senhaAtual: z.string().min(1) })
  .partial()
  .refine((d) => d.nome || d.email || d.senha, { message: 'Informe ao menos um campo' })
  .refine((d) => !(d.email || d.senha) || d.senhaAtual, {
    message: 'Informe a senha atual para alterar e-mail ou senha',
    path: ['senhaAtual'],
  });

const listUsuarioQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  status: z.enum(STATUS).optional(),
  busca: z.string().trim().min(1).optional(), // procura em nome ou e-mail
});

module.exports = {
  ROLES,
  STATUS,
  createUsuarioSchema,
  updateUsuarioSchema,
  permissaoSchema,
  updateMeSchema,
  listUsuarioQuerySchema,
};
