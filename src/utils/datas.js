// Datas por dia do calendário, no fuso do laboratório (process.env.TZ, ver config).
// O prazo de devolução é um DIA: o usuário só está atrasado a partir do dia seguinte.

const DIA_MS = 24 * 60 * 60 * 1000;

function inicioDoDia(data) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fimDoDia(data) {
  const d = new Date(data);
  d.setHours(23, 59, 59, 999);
  return d;
}

function somarDias(data, dias) {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}

// Quantos dias do calendário vão de "de" até "ate" (negativo se "ate" for antes).
// Math.round absorve a hora a mais/a menos de um eventual horário de verão.
function diasEntre(de, ate) {
  return Math.round((inicioDoDia(ate) - inicioDoDia(de)) / DIA_MS);
}

module.exports = { inicioDoDia, fimDoDia, somarDias, diasEntre };
