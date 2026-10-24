const { Router } = require('express');
const authRoutes = require('./auth.routes');
const usuarioRoutes = require('./usuario.routes');
const equipamentoRoutes = require('./equipamento.routes');
const emprestimoRoutes = require('./emprestimo.routes');

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/equipamentos', equipamentoRoutes);
router.use('/emprestimos', emprestimoRoutes);

module.exports = router;
