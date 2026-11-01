-- AlterTable
ALTER TABLE "agents" ADD COLUMN "department" TEXT;

-- CreateIndex
CREATE INDEX "agents_department_idx" ON "agents"("department");
