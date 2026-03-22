/*
  Warnings:

  - You are about to alter the column `amount` on the `AccountingEntry` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `amount` on the `BankTransaction` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AccountingEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AccountingEntry" ("amount", "createdAt", "date", "description", "id", "type") SELECT "amount", "createdAt", "date", "description", "id", "type" FROM "AccountingEntry";
DROP TABLE "AccountingEntry";
ALTER TABLE "new_AccountingEntry" RENAME TO "AccountingEntry";
CREATE TABLE "new_BankTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "bankSerialNo" TEXT NOT NULL,
    "description" TEXT,
    "accountingId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankTransaction_accountingId_fkey" FOREIGN KEY ("accountingId") REFERENCES "AccountingEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BankTransaction" ("accountingId", "amount", "bankSerialNo", "createdAt", "date", "description", "id") SELECT "accountingId", "amount", "bankSerialNo", "createdAt", "date", "description", "id" FROM "BankTransaction";
DROP TABLE "BankTransaction";
ALTER TABLE "new_BankTransaction" RENAME TO "BankTransaction";
CREATE UNIQUE INDEX "BankTransaction_bankSerialNo_key" ON "BankTransaction"("bankSerialNo");
CREATE UNIQUE INDEX "BankTransaction_accountingId_key" ON "BankTransaction"("accountingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
