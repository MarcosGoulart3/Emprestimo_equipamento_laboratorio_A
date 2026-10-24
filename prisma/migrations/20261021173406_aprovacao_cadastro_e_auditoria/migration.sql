/*
  Warnings:

  - You are about to drop the column `ativo` on the `Usuario` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Emprestimo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "equipamentoId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SOLICITADO',
    "dataSolicitacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPrevistaDevolucao" DATETIME NOT NULL,
    "dataRetirada" DATETIME,
    "motivoRejeicao" TEXT,
    "dataSolicitacaoDevolucao" DATETIME,
    "dataDevolucao" DATETIME,
    "avaliadoPorId" INTEGER,
    "recebidoPorId" INTEGER,
    CONSTRAINT "Emprestimo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Emprestimo_avaliadoPorId_fkey" FOREIGN KEY ("avaliadoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Emprestimo_recebidoPorId_fkey" FOREIGN KEY ("recebidoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Emprestimo_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Emprestimo" ("dataDevolucao", "dataPrevistaDevolucao", "dataRetirada", "dataSolicitacao", "dataSolicitacaoDevolucao", "equipamentoId", "id", "motivoRejeicao", "status", "usuarioId") SELECT "dataDevolucao", "dataPrevistaDevolucao", "dataRetirada", "dataSolicitacao", "dataSolicitacaoDevolucao", "equipamentoId", "id", "motivoRejeicao", "status", "usuarioId" FROM "Emprestimo";
DROP TABLE "Emprestimo";
ALTER TABLE "new_Emprestimo" RENAME TO "Emprestimo";
CREATE INDEX "Emprestimo_usuarioId_idx" ON "Emprestimo"("usuarioId");
CREATE INDEX "Emprestimo_equipamentoId_idx" ON "Emprestimo"("equipamentoId");
CREATE INDEX "Emprestimo_status_idx" ON "Emprestimo"("status");
CREATE TABLE "new_Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'usuario',
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "motivoRecusa" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);
INSERT INTO "new_Usuario" ("atualizadoEm", "criadoEm", "email", "id", "nome", "role", "senhaHash") SELECT "atualizadoEm", "criadoEm", "email", "id", "nome", "role", "senhaHash" FROM "Usuario";
DROP TABLE "Usuario";
ALTER TABLE "new_Usuario" RENAME TO "Usuario";
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
CREATE INDEX "Usuario_status_idx" ON "Usuario"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
