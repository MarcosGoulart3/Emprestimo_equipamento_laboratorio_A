const bcrypt = require('bcryptjs');
const { bcryptRounds } = require('../config');
const AppError = require('../errors/AppError');
const usuarioRepository = require('../repositories/usuario.repository');
const emprestimoRepository = require('../repositories/emprestimo.repository');
const emprestimoService = require('./EmprestimoService');

class UsuarioService {
  list(filter) {
    return usuarioRepository.findAll(filter);
  }

  async getById(id) {
    const usuario = await usuarioRepository.findById(id);
    if (!usuario) throw AppError.notFound('Usuário não encontrado');
    return usuario;
  }

  // Dados do usuário + situação de empréstimos (bloqueio, limite, atrasos).
  async getPerfil(id) {
    const usuario = await this.getById(id);
    return { ...usuario, ...(await emprestimoService.situacaoDoUsuario(id)) };
  }

  // Autocadastro e cadastro pelo admin: sempre "usuario" comum e ATIVO.
  async create({ nome, email, senha }) {
    await this.#assertEmailLivre(email);
    const senhaHash = await bcrypt.hash(senha, bcryptRounds);
    return usuarioRepository.create({ nome, email, senhaHash, role: 'usuario' });
  }

  // Alteração de dados (nome, e-mail, senha) feita por um admin.
  async update(ator, id, { senha, ...data }) {
    const alvo = await this.getById(id);
    this.#assertPodeGerenciar(ator, alvo);

    if (data.email && data.email !== alvo.email) await this.#assertEmailLivre(data.email);
    if (senha) data.senhaHash = await bcrypt.hash(senha, bcryptRounds);

    return usuarioRepository.update(id, data);
  }

  // Dar ou retirar permissão de admin. A rota já exige o admin principal.
  async alterarPermissao(id, { role }) {
    const alvo = await this.getById(id);
    if (alvo.principal) {
      throw AppError.unprocessable('A permissão do admin principal não pode ser alterada');
    }
    if (alvo.status !== 'ATIVO') {
      throw AppError.conflict('Só usuários ativos podem ter a permissão alterada');
    }
    if (alvo.role === role) {
      throw AppError.conflict(`O usuário já é ${role}`);
    }
    return usuarioRepository.update(id, { role });
  }

  // Exclusão lógica: o usuário perde o acesso, mas o histórico de empréstimos continua.
  async desativar(ator, id) {
    if (id === ator.id) throw AppError.unprocessable('Você não pode desativar a própria conta');
    const alvo = await this.getById(id);
    this.#assertPodeGerenciar(ator, alvo);
    this.#assertStatus(alvo, 'ATIVO');
    if ((await emprestimoRepository.countAbertos({ usuarioId: id })) > 0) {
      throw AppError.conflict('Usuário possui empréstimos em aberto e não pode ser desativado');
    }
    await usuarioRepository.update(id, { status: 'INATIVO' });
  }

  async reativar(ator, id) {
    const alvo = await this.getById(id);
    this.#assertPodeGerenciar(ator, alvo);
    this.#assertStatus(alvo, 'INATIVO');
    return usuarioRepository.update(id, { status: 'ATIVO' });
  }

  // Alteração do próprio perfil.
  async updateMe(id, { nome, email, senha, senhaAtual }) {
    const atual = await usuarioRepository.findByIdWithSenha(id);
    if (!atual) throw AppError.notFound('Usuário não encontrado');

    if (email || senha) {
      if (!(await bcrypt.compare(senhaAtual, atual.senhaHash))) {
        throw AppError.unprocessable('Senha atual incorreta');
      }
    }
    if (email && email !== atual.email) await this.#assertEmailLivre(email);

    const data = { nome, email };
    if (senha) data.senhaHash = await bcrypt.hash(senha, bcryptRounds);
    return usuarioRepository.update(id, data);
  }

  // Hierarquia: o principal só se altera pelo /me; outros admins só são
  // alterados pelo principal. Sem isso, um admin poderia trocar a senha do
  // principal e tomar a conta dele.
  #assertPodeGerenciar(ator, alvo) {
    if (alvo.principal) {
      throw AppError.forbidden('Os dados do admin principal só podem ser alterados por ele mesmo, em /usuarios/me');
    }
    if (alvo.role === 'admin' && !ator.principal) {
      throw AppError.forbidden('Apenas o admin principal pode alterar outros administradores');
    }
  }

  #assertStatus(usuario, esperado) {
    if (usuario.status !== esperado) {
      throw AppError.conflict(`Operação não permitida: usuário está ${usuario.status} (esperado ${esperado})`);
    }
  }

  async #assertEmailLivre(email) {
    if (await usuarioRepository.findByEmail(email)) {
      throw AppError.conflict('E-mail já cadastrado');
    }
  }
}

module.exports = new UsuarioService();
