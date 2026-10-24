const AppError = require('../errors/AppError');
const emprestimoRepository = require('../repositories/emprestimo.repository');
const equipamentoRepository = require('../repositories/equipamento.repository');
const usuarioRepository = require('../repositories/usuario.repository');
const { fimDoDia, somarDias, diasEntre } = require('../utils/datas');

const PRAZO_DIAS = 7;
const LIMITE_EMPRESTIMOS_POR_USUARIO = 2;

const ALTERADO_POR_OUTRA_OPERACAO = 'O empréstimo foi alterado por outra operação; recarregue e tente novamente';

class EmprestimoService {
  // Admin vê todos (e pode filtrar por usuário/equipamento); usuário comum só o próprio histórico.
  async list(user, filter = {}) {
    const where = { ...filter };
    if (user.role !== 'admin') where.usuarioId = user.id;
    const emprestimos = await emprestimoRepository.findAll(where);
    return emprestimos.map(comSituacaoDoPrazo);
  }

  async historicoDoUsuario(user, usuarioId) {
    if (!(await usuarioRepository.findById(usuarioId))) throw AppError.notFound('Usuário não encontrado');
    return this.list(user, { usuarioId });
  }

  async historicoDoEquipamento(user, equipamentoId) {
    if (!(await equipamentoRepository.findById(equipamentoId))) {
      throw AppError.notFound('Equipamento não encontrado');
    }
    return this.list(user, { equipamentoId });
  }

  async getById(user, id) {
    const emprestimo = await emprestimoRepository.findById(id);
    if (!emprestimo) throw AppError.notFound('Empréstimo não encontrado');
    if (user.role !== 'admin' && emprestimo.usuarioId !== user.id) {
      throw AppError.forbidden('Você não tem acesso a este empréstimo');
    }
    return comSituacaoDoPrazo(emprestimo);
  }

  // Bloqueado = tem empréstimo com prazo vencido que o admin ainda não recebeu.
  // É calculado na hora, então some sozinho quando a devolução é confirmada.
  async situacaoDoUsuario(usuarioId) {
    const [abertos, atrasados] = await Promise.all([
      emprestimoRepository.countAbertos({ usuarioId }),
      emprestimoRepository.findAtrasadosDoUsuario(usuarioId),
    ]);
    return {
      bloqueado: atrasados.length > 0,
      emprestimosEmAberto: abertos,
      limiteEmprestimos: LIMITE_EMPRESTIMOS_POR_USUARIO,
      emprestimosAtrasados: atrasados.map(comSituacaoDoPrazo),
    };
  }

  // Usuário pede para si; o admin também pode registrar em nome de outro usuário
  // (usuarioId). Nos dois casos valem bloqueio e limite do usuário que vai receber
  // o equipamento, e o prazo só começa quando o admin aprova.
  async solicitar(user, { equipamentoId, usuarioId = user.id }) {
    const emNomeDeOutro = usuarioId !== user.id;
    if (emNomeDeOutro) await this.#assertPodeSolicitarPara(user, usuarioId);

    await this.#assertNaoBloqueado(
      usuarioId,
      emNomeDeOutro
        ? 'Usuário bloqueado por atraso; ele precisa devolver o equipamento atrasado'
        : 'Você está bloqueado por atraso; devolva o equipamento para voltar a pedir',
    );

    const equipamento = await equipamentoRepository.findById(equipamentoId);
    if (!equipamento) throw AppError.notFound('Equipamento não encontrado');
    if (equipamento.status !== 'DISPONIVEL') {
      throw AppError.conflict('Equipamento não está disponível para empréstimo');
    }

    const { emprestimo, motivo } = await emprestimoRepository.criarSeDentroDoLimite(
      { usuarioId, equipamentoId },
      LIMITE_EMPRESTIMOS_POR_USUARIO,
    );
    if (motivo === 'LIMITE') {
      throw AppError.conflict(
        `Limite de ${LIMITE_EMPRESTIMOS_POR_USUARIO} empréstimos simultâneos atingido (pedidos pendentes contam)`,
      );
    }
    if (motivo === 'DUPLICADO') {
      throw AppError.conflict('Já existe uma solicitação ou empréstimo em aberto deste equipamento para o usuário');
    }
    return comSituacaoDoPrazo(emprestimo);
  }

  async aprovar(adminId, id) {
    const emprestimo = await this.#getComStatus(id, ['SOLICITADO']);
    await this.#assertNaoBloqueado(emprestimo.usuarioId, 'Usuário bloqueado por atraso; rejeite a solicitação');

    const equipamento = await equipamentoRepository.findById(emprestimo.equipamentoId);
    if (equipamento.status !== 'DISPONIVEL') {
      throw AppError.conflict(`Equipamento indisponível (status ${equipamento.status}); rejeite a solicitação`);
    }

    // Prazo é o dia da retirada + 7, até o fim desse dia (atraso só no dia seguinte).
    const dataRetirada = new Date();
    const dataPrevistaDevolucao = fimDoDia(somarDias(dataRetirada, PRAZO_DIAS));
    const aprovado = await emprestimoRepository.aprovar(id, emprestimo.equipamentoId, adminId, {
      dataRetirada,
      dataPrevistaDevolucao,
    });
    if (!aprovado) throw AppError.conflict(ALTERADO_POR_OUTRA_OPERACAO);
    return comSituacaoDoPrazo(aprovado);
  }

  async rejeitar(adminId, id, { motivo }) {
    await this.#getComStatus(id, ['SOLICITADO']);
    const rejeitado = await emprestimoRepository.transicionar(id, ['SOLICITADO'], {
      status: 'REJEITADO',
      motivoRejeicao: motivo,
      avaliadoPorId: adminId,
    });
    if (!rejeitado) throw AppError.conflict(ALTERADO_POR_OUTRA_OPERACAO);
    return comSituacaoDoPrazo(rejeitado);
  }

  // Usuário informa a devolução; ela só conclui com a confirmação do admin.
  async devolver(user, id) {
    const emprestimo = await this.getById(user, id);
    if (emprestimo.usuarioId !== user.id) {
      throw AppError.forbidden('Só quem pegou o equipamento pode informar a devolução');
    }
    this.#assertStatus(emprestimo, ['ATIVO']);

    const pendente = await emprestimoRepository.transicionar(id, ['ATIVO'], {
      status: 'DEVOLUCAO_PENDENTE',
      dataSolicitacaoDevolucao: new Date(),
    });
    if (!pendente) throw AppError.conflict(ALTERADO_POR_OUTRA_OPERACAO);
    return comSituacaoDoPrazo(pendente);
  }

  // Admin confirma que recebeu o equipamento. Aceita também ATIVO, para o caso
  // de o usuário entregar no balcão sem ter informado a devolução no sistema.
  async confirmarDevolucao(adminId, id) {
    const emprestimo = await this.#getComStatus(id, emprestimoRepository.STATUS_COM_USUARIO);
    const devolvido = await emprestimoRepository.confirmarDevolucao(id, emprestimo.equipamentoId, adminId);
    if (!devolvido) throw AppError.conflict(ALTERADO_POR_OUTRA_OPERACAO);
    return comSituacaoDoPrazo(devolvido);
  }

  async #assertPodeSolicitarPara(user, usuarioId) {
    if (user.role !== 'admin') {
      throw AppError.forbidden('Apenas administradores podem registrar empréstimo em nome de outro usuário');
    }
    const destinatario = await usuarioRepository.findById(usuarioId);
    if (!destinatario) throw AppError.notFound('Usuário não encontrado');
    if (destinatario.status !== 'ATIVO') {
      throw AppError.conflict('Não é possível registrar empréstimo para um usuário desativado');
    }
  }

  async #assertNaoBloqueado(usuarioId, mensagem) {
    if ((await emprestimoRepository.countAtrasadosDoUsuario(usuarioId)) > 0) {
      throw AppError.forbidden(mensagem);
    }
  }

  async #getComStatus(id, permitidos) {
    const emprestimo = await emprestimoRepository.findById(id);
    if (!emprestimo) throw AppError.notFound('Empréstimo não encontrado');
    this.#assertStatus(emprestimo, permitidos);
    return emprestimo;
  }

  #assertStatus(emprestimo, permitidos) {
    if (!permitidos.includes(emprestimo.status)) {
      throw AppError.conflict(
        `Operação não permitida: empréstimo está ${emprestimo.status} (esperado ${permitidos.join(' ou ')})`,
      );
    }
  }
}

// Acrescenta à resposta se o empréstimo está (ou foi devolvido) fora do prazo.
// Conta em dias do calendário: devolver no próprio dia do prazo não é atraso.
function comSituacaoDoPrazo(emprestimo) {
  const prevista = emprestimo.dataPrevistaDevolucao;
  const comUsuario = emprestimoRepository.STATUS_COM_USUARIO.includes(emprestimo.status);
  const fim = comUsuario ? new Date() : emprestimo.dataDevolucao;
  const diasAtraso = prevista && fim ? Math.max(0, diasEntre(prevista, fim)) : 0;

  return {
    ...emprestimo,
    atrasado: comUsuario && diasAtraso > 0,
    diasAtraso,
  };
}

module.exports = new EmprestimoService();
