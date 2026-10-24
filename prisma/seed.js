require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@lab.local';
  const senha = process.env.ADMIN_PASSWORD || 'admin123';

  // O admin principal só nasce aqui: nenhuma rota da API marca ou desmarca "principal".
  await prisma.usuario.upsert({
    where: { email },
    update: { role: 'admin', principal: true, status: 'ATIVO' },
    create: {
      nome: 'Administrador',
      email,
      senhaHash: await bcrypt.hash(senha, Number(process.env.BCRYPT_ROUNDS) || 12),
      role: 'admin',
      principal: true,
    },
  });
  console.log(`Admin principal pronto: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
