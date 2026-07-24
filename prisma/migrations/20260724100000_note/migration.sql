-- Team notes board
CREATE TABLE "Note" (
  "id" TEXT NOT NULL,
  "title" TEXT,
  "body" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT 'yellow',
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "link" TEXT,
  "remindAt" TIMESTAMP(3),
  "authorId" TEXT,
  "authorName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Note_pinned_idx" ON "Note"("pinned");
