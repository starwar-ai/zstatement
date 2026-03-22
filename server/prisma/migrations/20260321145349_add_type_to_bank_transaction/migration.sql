-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BankTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT '支出',
    "bankSerialNo" TEXT,
    "description" TEXT,
    "accountingId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankTransaction_accountingId_fkey" FOREIGN KEY ("accountingId") REFERENCES "AccountingEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BankTransaction" ("accountingId", "amount", "bankSerialNo", "createdAt", "date", "description", "id") SELECT "accountingId", "amount", "bankSerialNo", "createdAt", "date", "description", "id" FROM "BankTransaction";
DROP TABLE "BankTransaction";
ALTER TABLE "new_BankTransaction" RENAME TO "BankTransaction";
CREATE UNIQUE INDEX "BankTransaction_accountingId_key" ON "BankTransaction"("accountingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
