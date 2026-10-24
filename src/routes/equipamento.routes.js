const { Router } = require('express');
const equipamentoService = require('../services/EquipamentoService');
const emprestimoService = require('../services/EmprestimoService');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const validate = require('../middlewares/validate');
const { idParamSchema } = require('../validators/common.validator');
const {
  createEquipamentoSchema,
  updateEquipamentoSchema,
  listEquipamentoQuerySchema,
} = require('../validators/equipamento.validator');

const router = Router();
const idParam = validate(idParamSchema, 'params');

router.use(auth);

router.get('/', validate(listEquipamentoQuerySchema, 'query'), async (req, res) => {
  res.json(await equipamentoService.list(req.validated.query));
});

router.get('/:id', idParam, async (req, res) => {
  res.json(await equipamentoService.getById(req.validated.params.id));
});

// Histórico do equipamento mostra outros usuários: só admin.
router.get('/:id/emprestimos', requireRole('admin'), idParam, async (req, res) => {
  res.json(await emprestimoService.historicoDoEquipamento(req.user, req.validated.params.id));
});

router.post('/', requireRole('admin'), validate(createEquipamentoSchema), async (req, res) => {
  res.status(201).json(await equipamentoService.create(req.validated.body));
});

router.patch('/:id', requireRole('admin'), idParam, validate(updateEquipamentoSchema), async (req, res) => {
  res.json(await equipamentoService.update(req.validated.params.id, req.validated.body));
});

router.delete('/:id', requireRole('admin'), idParam, async (req, res) => {
  await equipamentoService.remove(req.validated.params.id);
  res.status(204).end();
});

module.exports = router;
