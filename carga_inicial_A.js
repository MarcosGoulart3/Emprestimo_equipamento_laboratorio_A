// Carga inicial dos testes de aceitação — Projeto A
//
// Cria usuários, equipamentos e empréstimos com datas passadas, que a API não permite criar
// (prazo vencido, histórico). Usada pelos cenários de atraso/bloqueio (CA-051 a CA-059),
// de histórico (CA-060 a CA-070) e de senha (CA-072 e CA-073).
//
// Uso (rode ANTES de cada execução da collection, na pasta do Projeto A):
//   node carga_inicial_A.js <pasta-do-projeto-A> [conjunto]      conjunto = 1 (padrão) ou 2
//
// Usa o cliente Prisma do próprio projeto (src/repositories/prisma.js), então grava no mesmo
// banco da API (DATABASE_URL do .env). É idempotente: apaga os dados da carga anterior do
// mesmo conjunto (prefixos fx./FX- no conjunto 1, fy./FY- no conjunto 2) e recria.
//
// Como o A não tem campo de texto livre no empréstimo, os empréstimos da carga são
// identificados pelo patrimônio do equipamento e, no histórico, pelo segundo da data de
// solicitação (H1 = :01, H2 = :02 …). O adaptador da collection usa a mesma regra.

const path = require('node:path');

const projeto = path.resolve(process.argv[2] || '.');
const conjunto = Number(process.argv[3] || 1);
process.chdir(projeto);
require(path.join(projeto, 'node_modules', 'dotenv')).config({ path: path.join(projeto, '.env'), quiet: true });
const prisma = require(path.join(projeto, 'src', 'repositories', 'prisma'));
const bcrypt = require(path.join(projeto, 'node_modules', 'bcryptjs'));

const SENHA = 'Senha@123';
const DOMINIO = '@teste.local';

// Data/hora LOCAL deslocada em dias. O prazo usa 00:00 do dia: no A o prazo é um instante,
// então um prazo "hoje às 00:00" já conta como vencido durante o dia de hoje.
function quando(offsetDias, h = 12, m = 0, s = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  d.setHours(h, m, s, 0);
  return d;
}
const prazo = (offset) => quando(offset, 0, 0, 0);

const CONJ = {
  1: {
    px: 'fx', PX: 'FX', marcaHist: 'H',
    usuarios: ['atraso3', 'prazohoje', 'bloqueado', 'informa', 'confirma', 'outro', 'hist.ana', 'hist.bruno', 'hist.carla'],
    equipamentos: [
      ['ATR-01', 'Notebook carga inicial', 'Notebook'], ['HOJE-01', 'Notebook carga inicial', 'Notebook'],
      ['BLQ-01', 'Kit Arduino carga inicial', 'Arduino'], ['BLQ-02', 'Kit Arduino carga inicial', 'Arduino'],
      ['INF-01', 'Notebook carga inicial', 'Notebook'], ['CNF-01', 'Notebook carga inicial', 'Notebook'],
      ['OUT-01', 'Notebook carga inicial', 'Notebook'], ['OUT-02', 'Kit Arduino carga inicial', 'Arduino'],
      ['H-01', 'Notebook Dell 5420 (histórico)', 'Notebook'], ['H-02', 'Notebook Lenovo E14 (histórico)', 'Notebook'],
      ['H-03', 'Kit Arduino Uno (histórico)', 'Arduino'],
    ],
    // [usuário, equipamento, status, solicitado, prazo, devolvido, nº do histórico]
    emprestimos: [
      ['atraso3', 'ATR-01', 'ATIVO', -10, -3, null],
      ['prazohoje', 'HOJE-01', 'ATIVO', -7, 0, null],
      ['bloqueado', 'BLQ-01', 'ATIVO', -8, -1, null],
      ['bloqueado', 'BLQ-02', 'SOLICITADO', -2, null, null],
      ['informa', 'INF-01', 'ATIVO', -8, -1, null],
      ['confirma', 'CNF-01', 'DEVOLUCAO_PENDENTE', -8, -1, null],
      ['outro', 'OUT-01', 'ATIVO', -8, -1, null],
      ['outro', 'OUT-02', 'ATIVO', -2, 5, null],
      ['hist.ana', 'H-01', 'DEVOLVIDO', -26, -19, -20, 1],
      ['hist.bruno', 'H-01', 'DEVOLVIDO', -17, -10, -7, 2],
      ['hist.ana', 'H-03', 'DEVOLVIDO', -12, -5, -5, 3],
      ['hist.ana', 'H-01', 'ATIVO', -6, 1, null, 4],
      ['hist.bruno', 'H-02', 'ATIVO', -9, -2, null, 5],
    ],
  },
  2: {
    px: 'fy', PX: 'FY', marcaHist: 'G',
    usuarios: ['atraso5', 'prazo.hoje', 'bloqueado', 'informa', 'confirma', 'outro', 'hist.davi', 'hist.elisa', 'hist.fabio'],
    equipamentos: [
      ['ATR-01', 'Osciloscópio carga inicial', 'Instrumentação'], ['HOJE-01', 'Multímetro carga inicial', 'Instrumentação'],
      ['BLQ-01', 'Raspberry Pi carga inicial', 'Raspberry Pi'], ['BLQ-02', 'Impressora 3D carga inicial', 'Impressão 3D'],
      ['INF-01', 'Fonte de bancada carga inicial', 'Instrumentação'], ['CNF-01', 'Raspberry Pi carga inicial', 'Raspberry Pi'],
      ['OUT-01', 'Gerador de funções carga inicial', 'Instrumentação'], ['OUT-02', 'Estação de solda carga inicial', 'Ferramentas'],
      ['H-01', 'Osciloscópio Tektronix TBS1052B (histórico)', 'Instrumentação'],
      ['H-02', 'Raspberry Pi 4 Model B (histórico)', 'Raspberry Pi'], ['H-03', 'Impressora 3D Ender 3 (histórico)', 'Impressão 3D'],
    ],
    emprestimos: [
      ['atraso5', 'ATR-01', 'ATIVO', -12, -5, null],
      ['prazo.hoje', 'HOJE-01', 'ATIVO', -7, 0, null],
      ['bloqueado', 'BLQ-01', 'ATIVO', -11, -4, null],
      ['bloqueado', 'BLQ-02', 'SOLICITADO', -6, null, null],
      ['informa', 'INF-01', 'ATIVO', -9, -2, null],
      ['confirma', 'CNF-01', 'DEVOLUCAO_PENDENTE', -13, -6, null],
      ['outro', 'OUT-01', 'ATIVO', -10, -3, null],
      ['outro', 'OUT-02', 'ATIVO', -5, 2, null],
      ['hist.davi', 'H-01', 'DEVOLVIDO', -30, -23, -24, 1],
      ['hist.elisa', 'H-02', 'DEVOLVIDO', -21, -14, -11, 2],
      ['hist.davi', 'H-01', 'REJEITADO', -12, null, null, 6],
      ['hist.davi', 'H-02', 'DEVOLVIDO', -10, -3, -4, 3],
      ['hist.elisa', 'H-01', 'ATIVO', -8, -1, null, 4],
      ['hist.davi', 'H-03', 'ATIVO', -3, 4, null, 5],
    ],
  },
}[conjunto];

if (!CONJ) {
  console.error('Conjunto inválido: use 1 ou 2');
  process.exit(1);
}

async function main() {
  const admin = await prisma.usuario.findFirst({ where: { role: 'admin', principal: true } })
    ?? await prisma.usuario.findFirst({ where: { role: 'admin' } });
  if (!admin) throw new Error('Nenhum administrador encontrado. Rode "npx prisma migrate reset" (ou "npm run db:seed") antes.');

  // ---- limpa a carga anterior deste conjunto ----
  const usuariosAntigos = await prisma.usuario.findMany({ where: { email: { startsWith: `${CONJ.px}.` } }, select: { id: true } });
  const equipsAntigos = await prisma.equipamento.findMany({ where: { patrimonio: { startsWith: `${CONJ.PX}-` } }, select: { id: true } });
  await prisma.emprestimo.deleteMany({
    where: { OR: [{ usuarioId: { in: usuariosAntigos.map((u) => u.id) } }, { equipamentoId: { in: equipsAntigos.map((e) => e.id) } }] },
  });
  await prisma.equipamento.deleteMany({ where: { id: { in: equipsAntigos.map((e) => e.id) } } });
  await prisma.usuario.deleteMany({ where: { id: { in: usuariosAntigos.map((u) => u.id) } } });

  // ---- usuários ----
  const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
  const usuarios = {};
  for (const nome of CONJ.usuarios) {
    const u = await prisma.usuario.create({
      data: { nome: `${CONJ.PX} ${nome}`, email: `${CONJ.px}.${nome}${DOMINIO}`, senhaHash: await bcrypt.hash(SENHA, rounds), role: 'usuario' },
    });
    usuarios[nome] = u.id;
  }

  // ---- equipamentos ----
  const equips = {};
  for (const [tag, descricao, categoria] of CONJ.equipamentos) {
    const e = await prisma.equipamento.create({ data: { patrimonio: `${CONJ.PX}-${tag}`, descricao, categoria } });
    equips[tag] = e.id;
  }

  // ---- empréstimos ----
  for (const [usuario, tag, status, solicitado, prazoDias, devolvido, nHist] of CONJ.emprestimos) {
    const aprovado = !['SOLICITADO', 'REJEITADO'].includes(status);
    await prisma.emprestimo.create({
      data: {
        usuarioId: usuarios[usuario],
        equipamentoId: equips[tag],
        status,
        // no histórico, o segundo da data de solicitação identifica o empréstimo (H1 = :01 …)
        dataSolicitacao: quando(solicitado, 12, 0, nHist || 0),
        dataRetirada: aprovado ? quando(solicitado, 12, 30) : null,
        dataPrevistaDevolucao: prazoDias === null ? null : prazo(prazoDias),
        dataSolicitacaoDevolucao: status === 'DEVOLUCAO_PENDENTE' ? quando(prazoDias, 10) : null,
        dataDevolucao: devolvido === null ? null : quando(devolvido, 12),
        motivoRejeicao: status === 'REJEITADO' ? 'Equipamento reservado para aula' : null,
        avaliadoPorId: aprovado || status === 'REJEITADO' ? admin.id : null,
        recebidoPorId: status === 'DEVOLVIDO' ? admin.id : null,
      },
    });
    if (status === 'ATIVO' || status === 'DEVOLUCAO_PENDENTE') {
      await prisma.equipamento.update({ where: { id: equips[tag] }, data: { status: 'EMPRESTADO' } });
    }
  }

  console.log(`Carga inicial do Projeto A (conjunto ${conjunto}) pronta: ${CONJ.usuarios.length} usuários, ` +
    `${CONJ.equipamentos.length} equipamentos, ${CONJ.emprestimos.length} empréstimos (senha dos usuários: ${SENHA}).`);
}

main()
  .catch((err) => { console.error(err.message || err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
