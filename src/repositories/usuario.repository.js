const prisma = require('./prisma');

const publicFields = {
  id: true,
  nome: true,
  email: true,
  role: true,
  principal: true,
  status: true,
  criadoEm: true,
  atualizadoEm: true,
};

module.exports = {
  findAll({ role, status, busca } = {}) {
    const where = { role, status };
    if (busca) {
      where.OR = [{ nome: { contains: busca } }, { email: { contains: busca } }];
    }
    return prisma.usuario.findMany({ where, select: publicFields, orderBy: { nome: 'asc' } });
  },

  // Inclui senhaHash: usar só para autenticação/confirmação de senha.
  findByEmail(email) {
    return prisma.usuario.findUnique({ where: { email } });
  },

  findByIdWithSenha(id) {
    return prisma.usuario.findUnique({ where: { id } });
  },

  findById(id) {
    return prisma.usuario.findUnique({ where: { id }, select: publicFields });
  },

  create(data) {
    return prisma.usuario.create({ data, select: publicFields });
  },

  update(id, data) {
    return prisma.usuario.update({ where: { id }, data, select: publicFields });
  },
};
