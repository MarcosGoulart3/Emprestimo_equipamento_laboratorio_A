const { Router } = require('express');
const authService = require('../services/AuthService');
const validate = require('../middlewares/validate');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

const router = Router();

router.post('/register', validate(registerSchema), async (req, res) => {
  res.status(201).json(await authService.register(req.validated.body));
});

router.post('/login', validate(loginSchema), async (req, res) => {
  res.json(await authService.login(req.validated.body));
});

module.exports = router;
