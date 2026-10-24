const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn, bcryptRounds } = require('../config');
const AppError = require('../errors/AppError');
const usuarioRepository = require('../repositories/usuario.repository');
const usuarioService = require('./UsuarioService');

// Algoritmo fixo: impede tokens com "alg: none" ou trocados para outro algoritmo.
const JWT_ALGORITHM = 'HS256';

// Comparado quando o e-mail não existe, para o login levar o mesmo tempo
// e não revelar quais e-mails estão cadastrados.
const HASH_FICTICIO = bcrypt.hashSync('senha-ficticia-para-tempo-constante', bcryptRounds);

class AuthService {
  // Autocadastro: sempre "usuario" comum, já liberado para usar o sistema.
  register({ nome, email, senha }) {
    return usuarioService.create({ nome, email, senha });
  }

  async login({ email, senha }) {
    const usuario = await usuarioRepository.findByEmail(email);
    const senhaConfere = await bcrypt.compare(senha, usuario?.senhaHash ?? HASH_FICTICIO);
    if (!usuario || !senhaConfere) {
      throw AppError.unauthorized('Credenciais inválidas');
    }
    if (usuario.status !== 'ATIVO') throw AppError.forbidden('Usuário desativado');

    // O "role" no token é só informativo para o cliente: a autorização sempre
    // relê o papel no banco (ver usuarioAutenticado).
    const token = jwt.sign({ role: usuario.role }, jwtSecret, {
      algorithm: JWT_ALGORITHM,
      subject: String(usuario.id),
      expiresIn: jwtExpiresIn,
    });
    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        principal: usuario.principal,
      },
    };
  }

  // Usado pelo middleware a cada requisição. Duas defesas contra token adulterado:
  // 1) a assinatura HMAC não confere se qualquer byte do payload mudar;
  // 2) papel e status vêm do banco, nunca do token.
  async usuarioAutenticado(token) {
    let payload;
    try {
      payload = jwt.verify(token, jwtSecret, { algorithms: [JWT_ALGORITHM] });
    } catch {
      throw AppError.unauthorized('Token inválido ou expirado');
    }

    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) throw AppError.unauthorized('Token inválido ou expirado');

    const usuario = await usuarioRepository.findById(id);
    if (usuario?.status !== 'ATIVO') throw AppError.unauthorized('Usuário inexistente ou desativado');
    return { id: usuario.id, role: usuario.role, principal: usuario.principal };
  }
}

module.exports = new AuthService();
