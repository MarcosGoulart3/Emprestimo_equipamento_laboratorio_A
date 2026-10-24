require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido no .env');
}

// Fuso do laboratório: define o que é "hoje" para prazo e atraso, mesmo que o
// servidor rode em UTC. Precisa ser aplicado antes de qualquer cálculo de data.
process.env.TZ = process.env.TZ || 'America/Sao_Paulo';

module.exports = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  // Custo do bcrypt (2^n iterações). Cada hash usa um salt aleatório próprio.
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
};
