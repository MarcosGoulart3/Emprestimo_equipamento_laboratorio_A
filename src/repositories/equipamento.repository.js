const prisma = require('./prisma');

module.exports = {
  findAll({ status, categoria, busca } = {}) {
    const where = { status, categoria };
    if (busca) {
      where.OR = [{ patrimonio: { contains: busca } }, { descricao: { contains: busca } }];
    }
    return prisma.equipamento.findMany({ where, orderBy: [{ categoria: 'asc' }, { patrimonio: 'asc' }] });
  },

  findByPatrimonio(patrimonio) {
    return prisma.equipamento.findUnique({ where: { patrimonio } });
  },

  findById(id) {
    return prisma.equipamento.findUnique({ where: { id } });
  },

  create(data) {
    return prisma.equipamento.create({ data });
  },

  update(id, data) {
    return prisma.equipamento.update({ where: { id }, data });
  },

  delete(id) {
    return prisma.equipamento.delete({ where: { id } });
  },

  countEmprestimos(id) {
    return prisma.emprestimo.count({ where: { equipamentoId: id } });
  },
};
