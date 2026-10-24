/*
  Warnings:

  - You are about to drop the column `nome` on the `Equipamento` table. All the data in the column will be lost.
  - Added the required column `atualizadoEm` to the `Equipamento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoria` to the `Equipamento` table without a default value. This is not possible if the table is not empty.
  - Made the column `descricao` on table `Equipamento` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Equipamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patrimonio" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISPONIVEL',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);
INSERT INTO "new_Equipamento" ("criadoEm", "descricao", "id", "patrimonio", "status") SELECT "criadoEm", "descricao", "id", "patrimonio", "status" FROM "Equipamento";
DROP TABLE "Equipamento";
ALTER TABLE "new_Equipamento" RENAME TO "Equipamento";
CREATE UNIQUE INDEX "Equipamento_patrimonio_key" ON "Equipamento"("patrimonio");
CREATE INDEX "Equipamento_categoria_idx" ON "Equipamento"("categoria");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
