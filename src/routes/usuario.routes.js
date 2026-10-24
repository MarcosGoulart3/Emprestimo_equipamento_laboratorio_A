const { Router } = require('express');
const usuarioService = require('../services/UsuarioService');
const emprestimoService = require('../services/EmprestimoService');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const requirePrincipal = require('../middlewares/requirePrincipal');
const validate = require('../middlewares/validate');
const { idParamSchema } = require('../validators/common.validator');
const {
  createUsuarioSchema,
  updateUsuarioSchema,
  permissaoSchema,
  updateMeSchema,
  listUsuarioQuerySchema,
} = require('../validators/usuario.validator');

const router = Router();
const idParam = validate(idParamSchema, 'params');

router.use(auth);

// Perfil do próprio usuário (declarado antes de /:id).
router.get('/me', async (req, res) => {
  res.json(await usuarioService.getPerfil(req.user.id));
});

router.patch('/me', validate(updateMeSchema), async (req, res) => {
  res.json(await usuarioService.updateMe(req.user.id, req.validated.body));
});

// Gestão de usuários: só admin.
router.use(requireRole('admin'));

router.get('/', validate(listUsuarioQuerySchema, 'query'), async (req, res) => {
  res.json(await usuarioService.list(req.validated.query));
});

router.get('/:id', idParam, async (req, res) => {
  res.json(await usuarioService.getPerfil(req.validated.params.id));
});

router.get('/:id/emprestimos', idParam, async (req, res) => {
  res.json(await emprestimoService.historicoDoUsuario(req.user, req.validated.params.id));
});

router.post('/', validate(createUsuarioSchema), async (req, res) => {
  res.status(201).json(await usuarioService.create(req.validated.body));
});

router.patch('/:id', idParam, validate(updateUsuarioSchema), async (req, res) => {
  res.json(await usuarioService.update(req.user, req.validated.params.id, req.validated.body));
});

router.patch('/:id/reativar', idParam, async (req, res) => {
  res.json(await usuarioService.reativar(req.user, req.validated.params.id));
});

router.delete('/:id', idParam, async (req, res) => {
  await usuarioService.desativar(req.user, req.validated.params.id);
  res.status(204).end();
});

// Dar/retirar permissão de admin: só o admin principal.
router.patch('/:id/permissao', requirePrincipal, idParam, validate(permissaoSchema), async (req, res) => {
  res.json(await usuarioService.alterarPermissao(req.validated.params.id, req.validated.body));
});

module.exports = router;
