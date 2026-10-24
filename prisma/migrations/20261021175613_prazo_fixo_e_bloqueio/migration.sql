-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Emprestimo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "equipamentoId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SOLICITADO',
    "dataSolicitacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataRetirada" DATETIME,
    "dataPrevistaDevolucao" DATETIME,
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
INSERT INTO "new_Emprestimo" ("avaliadoPorId", "dataDevolucao", "dataPrevistaDevolucao", "dataRetirada", "dataSolicitacao", "dataSolicitacaoDevolucao", "equipamentoId", "id", "motivoRejeicao", "recebidoPorId", "status", "usuarioId") SELECT "avaliadoPorId", "dataDevolucao", "dataPrevistaDevolucao", "dataRetirada", "dataSolicitacao", "dataSolicitacaoDevolucao", "equipamentoId", "id", "motivoRejeicao", "recebidoPorId", "status", "usuarioId" FROM "Emprestimo";
DROP TABLE "Emprestimo";
ALTER TABLE "new_Emprestimo" RENAME TO "Emprestimo";
CREATE INDEX "Emprestimo_usuarioId_idx" ON "Emprestimo"("usuarioId");
CREATE INDEX "Emprestimo_equipamentoId_idx" ON "Emprestimo"("equipamentoId");
CREATE INDEX "Emprestimo_status_idx" ON "Emprestimo"("status");
CREATE INDEX "Emprestimo_dataPrevistaDevolucao_idx" ON "Emprestimo"("dataPrevistaDevolucao");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
