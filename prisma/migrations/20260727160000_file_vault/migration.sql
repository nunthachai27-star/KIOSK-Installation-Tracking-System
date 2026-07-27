-- Team file vault (in the notes tab): folders + files. Files live on a disk
-- volume; this table holds only metadata so DB backups stay small.
CREATE TABLE "FileFolder" (
  "id"            TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "createdByName" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FileFolder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FileAsset" (
  "id"             TEXT NOT NULL,
  "folderId"       TEXT,
  "name"           TEXT NOT NULL,
  "originalName"   TEXT NOT NULL,
  "ext"            TEXT,
  "mimeType"       TEXT,
  "size"           INTEGER NOT NULL,
  "note"           TEXT,
  "storedPath"     TEXT NOT NULL,
  "uploadedByName" TEXT,
  "downloads"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FileAsset_folderId_idx" ON "FileAsset"("folderId");
CREATE INDEX "FileAsset_createdAt_idx" ON "FileAsset"("createdAt");
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_folderId_fkey"
  FOREIGN KEY ("folderId") REFERENCES "FileFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
