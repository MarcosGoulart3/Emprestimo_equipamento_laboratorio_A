// CA-072 e CA-073 — verificação direta no banco do Projeto A (via Prisma do próprio projeto).
// Usa os usuários fx.hist.ana e fx.hist.bruno, criados pela carga inicial (conjunto 1) com a mesma senha.
//
// Uso: node verificar_senhas_A.js <pasta-do-projeto-A>

const path = require('node:path');

const projeto = path.resolve(process.argv[2] || '.');
process.chdir(projeto);
require(path.join(projeto, 'node_modules', 'dotenv')).config({ path: path.join(projeto, '.env'), quiet: true });
const prisma = require(path.join(projeto, 'src', 'repositories', 'prisma'));

const SENHA = 'Senha@123';
const HASH_DE_SENHA = /^(\$2[aby]\$\d{2}\$.{53}|\$argon2(id|i|d)\$.+|\$scrypt\$.+|scrypt:.+|\$pbkdf2(-sha\d+)?\$.+|pbkdf2(_sha\d+)?[:$].+)$/;

async function main() {
  const ler = async (email) => (await prisma.usuario.findUnique({ where: { email } }))?.senhaHash;
  const ana = await ler('fx.hist.ana@teste.local');
  const bruno = await ler('fx.hist.bruno@teste.local');
  if (!ana || !bruno) {
    console.error('Usuários da carga inicial não encontrados. Rode "node carga_inicial_A.js . 1" antes.');
    process.exitCode = 1;
    return;
  }
  const resultados = [
    ['CA-072', 'Senha não é armazenada em texto puro', [
      ['valor armazenado diferente da senha', ana !== SENHA],
      ['valor armazenado não contém a senha', !ana.includes(SENHA)],
      ['formato de hash próprio para senhas', HASH_DE_SENHA.test(ana)],
    ]],
    ['CA-073', 'Senhas iguais geram hashes diferentes (salt)', [
      ['hashes de ana e bruno são diferentes', ana !== bruno],
    ]],
  ];
  let falhou = false;
  for (const [id, nome, checks] of resultados) {
    const ok = checks.every(([, v]) => v);
    falhou ||= !ok;
    console.log(`${ok ? 'PASSOU' : 'FALHOU'}  ${id}  ${nome}`);
    for (const [desc, v] of checks) console.log(`         ${v ? '✓' : '✗'} ${desc}`);
  }
  console.log(`\nFormato encontrado: ${ana.slice(0, 7)}… (${ana.length} caracteres)`);
  process.exitCode = falhou ? 1 : 0;
}

main().catch((e) => { console.error(e.message || e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
