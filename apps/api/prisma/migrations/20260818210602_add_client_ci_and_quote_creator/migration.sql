-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "ci" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "createdBy" TEXT;
