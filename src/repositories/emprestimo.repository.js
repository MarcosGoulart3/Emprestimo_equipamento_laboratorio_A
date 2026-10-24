const prisma = require('./prisma');
const { inicioDoDia } = require('../utils/datas');

const include = {
  equipamento: { select: { id: true, patrimonio: true, descricao: true, categoria: true } },
  usuario: { select: { id: true, nome: true, email: true } },
  avaliadoPor: { select: { id: true, nome: true } },
  recebidoPor: { select: { id: true, nome: true } },
};

const STATUS_ABERTOS = ['SOLICITADO', 'ATIVO', 'DEVOLUCAO_PENDENTE'];

// Equipamento ainda com o usuário (a devolução só conta quando o admin confirma).
const STATUS_COM_USUARIO = ['ATIVO', 'DEVOLUCAO_PENDENTE'];

// Empréstimos com o prazo vencido e o equipamento ainda não recebido pelo admin.
// O prazo é um dia: só está atrasado se o dia do prazo for anterior a hoje.
const whereAtrasados = () => ({
  status: { in: STATUS_COM_USUARIO },
  dataPrevistaDevolucao: { lt: inicioDoDia(new Date()) },
});

// Lançado dentro da transação para forçar rollback quando outra requisição
// alterou o empréstimo/equipamento entre a validação e a escrita.
class TransicaoConcorrente extends Error {}

async function emTransacao(fn) {
  try {
    return await prisma.$transaction(fn);
  } catch (err) {
    if (err instanceof TransicaoConcorrente) return null;
    throw err;
  }
}

module.exports = {
  STATUS_ABERTOS,
  STATUS_COM_USUARIO,

  findAll({ atrasados, ...filter } = {}) {
    const where = atrasados ? { ...filter, ...whereAtrasados() } : filter;
    return prisma.emprestimo.findMany({ where, include, orderBy: { dataSolicitacao: 'desc' } });
  },

  findById(id) {
    return prisma.emprestimo.findUnique({ where: { id }, include });
  },

  countAbertos(where) {
    return prisma.emprestimo.count({ where: { ...where, status: { in: STATUS_ABERTOS } } });
  },

  findAtrasadosDoUsuario(usuarioId) {
    return prisma.emprestimo.findMany({
      where: { usuarioId, ...whereAtrasados() },
      include,
      orderBy: { dataPrevistaDevolucao: 'asc' },
    });
  },

  countAtrasadosDoUsuario(usuarioId) {
    return prisma.emprestimo.count({ where: { usuarioId, ...whereAtrasados() } });
  },

  // Conta e cria na mesma transação, com o usuário travado: pedidos simultâneos
  // do mesmo usuário são atendidos um de cada vez, então o limite não estoura.
  // Devolve { emprestimo } ou { motivo: 'LIMITE' | 'DUPLICADO' }.
  criarSeDentroDoLimite({ usuarioId, equipamentoId }, limite) {
    return prisma.$transaction(async (tx) => {
      // Escrita sem efeito na linha do usuário: obtém a trava de escrita antes da
      // contagem (no SQLite, a do banco; no PostgreSQL, a da linha). Parâmetro
      // passado pelo template do Prisma, nunca concatenado.
      await tx.$executeRaw`UPDATE "Usuario" SET "id" = "id" WHERE "id" = ${usuarioId}`;

      const abertos = await tx.emprestimo.findMany({
        where: { usuarioId, status: { in: STATUS_ABERTOS } },
        select: { equipamentoId: true },
      });
      if (abertos.length >= limite) return { motivo: 'LIMITE' };
      if (abertos.some((e) => e.equipamentoId === equipamentoId)) return { motivo: 'DUPLICADO' };

      return { emprestimo: await tx.emprestimo.create({ data: { usuarioId, equipamentoId }, include }) };
    });
  },

  // Muda o status só se ele ainda for um dos esperados; devolve null caso contrário.
  async transicionar(id, de, data) {
    const { count } = await prisma.emprestimo.updateMany({ where: { id, status: { in: de } }, data });
    return count ? this.findById(id) : null;
  },

  // SOLICITADO -> ATIVO e equipamento DISPONIVEL -> EMPRESTADO, tudo ou nada.
  aprovar(id, equipamentoId, adminId, { dataRetirada, dataPrevistaDevolucao }) {
    return emTransacao(async (tx) => {
      const emp = await tx.emprestimo.updateMany({
        where: { id, status: 'SOLICITADO' },
        data: { status: 'ATIVO', dataRetirada, dataPrevistaDevolucao, avaliadoPorId: adminId },
      });
      const eq = await tx.equipamento.updateMany({
        where: { id: equipamentoId, status: 'DISPONIVEL' },
        data: { status: 'EMPRESTADO' },
      });
      if (emp.count === 0 || eq.count === 0) throw new TransicaoConcorrente();
      return tx.emprestimo.findUnique({ where: { id }, include });
    });
  },

  // ATIVO/DEVOLUCAO_PENDENTE -> DEVOLVIDO e libera o equipamento.
  confirmarDevolucao(id, equipamentoId, adminId) {
    return emTransacao(async (tx) => {
      const emp = await tx.emprestimo.updateMany({
        where: { id, status: { in: STATUS_COM_USUARIO } },
        data: { status: 'DEVOLVIDO', dataDevolucao: new Date(), recebidoPorId: adminId },
      });
      if (emp.count === 0) throw new TransicaoConcorrente();
      await tx.equipamento.update({ where: { id: equipamentoId }, data: { status: 'DISPONIVEL' } });
      return tx.emprestimo.findUnique({ where: { id }, include });
    });
  },
};
