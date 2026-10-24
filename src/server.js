const { port } = require('./config');
const app = require('./app');

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}/api`);
});
