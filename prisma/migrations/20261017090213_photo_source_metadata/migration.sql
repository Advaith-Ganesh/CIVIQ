-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Photograph" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dataType" TEXT NOT NULL DEFAULT 'USER_SUBMITTED',
    "sourceId" TEXT,
    "originalRecordId" TEXT,
    "path" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "reportId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photograph_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Photograph" ("createdAt", "id", "mime", "path", "reportId") SELECT "createdAt", "id", "mime", "path", "reportId" FROM "Photograph";
DROP TABLE "Photograph";
ALTER TABLE "new_Photograph" RENAME TO "Photograph";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
