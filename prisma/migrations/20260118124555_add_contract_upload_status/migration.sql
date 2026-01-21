-- CreateEnum
CREATE TYPE "FileUploadStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "uploadAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uploadError" TEXT,
ADD COLUMN     "uploadStatus" "FileUploadStatus" NOT NULL DEFAULT 'SUCCEEDED';
