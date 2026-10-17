-- CreateTable
CREATE TABLE "ImageAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "photographId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelId" TEXT,
    "revision" TEXT,
    "status" TEXT NOT NULL,
    "categoryId" TEXT,
    "abstained" BOOLEAN NOT NULL DEFAULT true,
    "durationMs" REAL,
    "result" TEXT NOT NULL,
    "correctedCategoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImageAnalysis_photographId_fkey" FOREIGN KEY ("photographId") REFERENCES "Photograph" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TextEmbedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "vector" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ImportedRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "originalRecordId" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "referenceDate" DATETIME NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" TEXT NOT NULL,
    CONSTRAINT "ImportedRecord_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DatasetSource" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModelEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "result" TEXT NOT NULL,
    "evaluatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DatasetSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "retrievedAt" DATETIME NOT NULL,
    "note" TEXT NOT NULL,
    "dataType" TEXT NOT NULL DEFAULT 'OFFICIAL_AGGREGATE',
    "licence" TEXT NOT NULL DEFAULT 'Reuse terms unverified; attribution link only',
    "coverage" TEXT NOT NULL DEFAULT 'Southampton',
    "originalRecordId" TEXT,
    "importDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'metadata_only',
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "payload" TEXT NOT NULL DEFAULT '{}'
);
INSERT INTO "new_DatasetSource" ("id", "note", "period", "retrievedAt", "title", "url") SELECT "id", "note", "period", "retrievedAt", "title", "url" FROM "DatasetSource";
DROP TABLE "DatasetSource";
ALTER TABLE "new_DatasetSource" RENAME TO "DatasetSource";
CREATE TABLE "new_Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Submitted',
    "severity" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,
    "override" INTEGER,
    "context" REAL NOT NULL DEFAULT 0.5,
    "synthetic" BOOLEAN NOT NULL DEFAULT false,
    "dataType" TEXT NOT NULL DEFAULT 'USER_SUBMITTED',
    "sourceId" TEXT,
    "originalRecordId" TEXT,
    "referenceDate" DATETIME,
    "importedAt" DATETIME,
    "accessibility" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "closedAt" DATETIME,
    CONSTRAINT "Issue_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Issue" ("categoryId", "closedAt", "context", "createdAt", "description", "id", "lat", "lng", "location", "override", "priority", "severity", "status", "synthetic", "title", "updatedAt") SELECT "categoryId", "closedAt", "context", "createdAt", "description", "id", "lat", "lng", "location", "override", "priority", "severity", "status", "synthetic", "title", "updatedAt" FROM "Issue";
DROP TABLE "Issue";
ALTER TABLE "new_Issue" RENAME TO "Issue";
CREATE INDEX "Issue_categoryId_status_createdAt_idx" ON "Issue"("categoryId", "status", "createdAt");
CREATE INDEX "Issue_lat_lng_idx" ON "Issue"("lat", "lng");
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "synthetic" BOOLEAN NOT NULL DEFAULT false,
    "dataType" TEXT NOT NULL DEFAULT 'USER_SUBMITTED',
    "sourceId" TEXT,
    "originalRecordId" TEXT,
    "referenceDate" DATETIME,
    "importedAt" DATETIME,
    "accessibility" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("createdAt", "description", "id", "issueId", "lat", "lng", "reference", "synthetic") SELECT "createdAt", "description", "id", "issueId", "lat", "lng", "reference", "synthetic" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
CREATE UNIQUE INDEX "Report_reference_key" ON "Report"("reference");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ImageAnalysis_photographId_createdAt_idx" ON "ImageAnalysis"("photographId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedRecord_sourceId_originalRecordId_key" ON "ImportedRecord"("sourceId", "originalRecordId");
