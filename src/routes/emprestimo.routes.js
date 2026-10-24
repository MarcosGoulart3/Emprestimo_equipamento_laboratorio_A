const { Router } = require('express');
const emprestimoService = require('../services/EmprestimoService');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const validate = require('../middlewares/validate');
const { idParamSchema, motivoSchema } = require('../validators/common.validator');
const { createEmprestimoSchema, listEmprestimoQuerySchema } = require('../validators/emprestimo.validator');

const router = Router();
const idParam = validate(idParamSchema, 'params');

router.use(auth);

router.get('/', validate(listEmprestimoQuerySchema, 'query'), async (req, res) => {
  res.json(await emprestimoService.list(req.user, req.validated.query));
});

router.get('/:id', idParam, async (req, res) => {
  res.json(await emprestimoService.getById(req.user, req.validated.params.id));
});

// Usuário
router.post('/', validate(createEmprestimoSchema), async (req, res) => {
  res.status(201).json(await emprestimoService.solicitar(req.user, req.validated.body));
});

router.patch('/:id/devolucao', idParam, async (req, res) => {
  res.json(await emprestimoService.devolver(req.user, req.validated.params.id));
});

// Admin
router.patch('/:id/aprovar', requireRole('admin'), idParam, async (req, res) => {
  res.json(await emprestimoService.aprovar(req.user.id, req.validated.params.id));
});

router.patch('/:id/rejeitar', requireRole('admin'), idParam, validate(motivoSchema), async (req, res) => {
  res.json(await emprestimoService.rejeitar(req.user.id, req.validated.params.id, req.validated.body));
});

router.patch('/:id/confirmar-devolucao', requireRole('admin'), idParam, async (req, res) => {
  res.json(await emprestimoService.confirmarDevolucao(req.user.id, req.validated.params.id));
});

module.exports = router;
