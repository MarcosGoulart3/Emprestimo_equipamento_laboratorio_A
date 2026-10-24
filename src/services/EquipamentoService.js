const AppError = require('../errors/AppError');
const equipamentoRepository = require('../repositories/equipamento.repository');

class EquipamentoService {
  list(filter) {
    return equipamentoRepository.findAll(filter);
  }

  async getById(id) {
    const equipamento = await equipamentoRepository.findById(id);
    if (!equipamento) throw AppError.notFound('Equipamento não encontrado');
    return equipamento;
  }

  async create(data) {
    await this.#assertPatrimonioLivre(data.patrimonio);
    return equipamentoRepository.create(data);
  }

  async update(id, data) {
    const atual = await this.getById(id);
    if (data.status && atual.status === 'EMPRESTADO') {
      throw AppError.conflict('Equipamento emprestado; registre a devolução antes de alterar o status');
    }
    if (data.patrimonio && data.patrimonio !== atual.patrimonio) {
      await this.#assertPatrimonioLivre(data.patrimonio);
    }
    return equipamentoRepository.update(id, data);
  }

  async remove(id) {
    await this.getById(id);
    if ((await equipamentoRepository.countEmprestimos(id)) > 0) {
      throw AppError.conflict('Equipamento possui histórico de empréstimos e não pode ser excluído');
    }
    await equipamentoRepository.delete(id);
  }

  async #assertPatrimonioLivre(patrimonio) {
    if (await equipamentoRepository.findByPatrimonio(patrimonio)) {
      throw AppError.conflict(`Já existe um equipamento com o patrimônio ${patrimonio}`);
    }
  }
}

module.exports = new EquipamentoService();
