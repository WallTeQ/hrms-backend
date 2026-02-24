-- Add columns to Task for storing completion attachment metadata
ALTER TABLE "Task"
  ADD COLUMN "completedAttachmentUrl" TEXT,
  ADD COLUMN "completedAttachmentPublicId" TEXT,
  ADD COLUMN "completedAttachmentMimeType" TEXT,
  ADD COLUMN "completedAttachmentSize" INTEGER;