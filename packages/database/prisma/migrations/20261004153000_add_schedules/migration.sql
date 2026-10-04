-- AlterEnum
ALTER TYPE "RunTrigger" ADD VALUE 'schedule';

-- CreateEnum
CREATE TYPE "ScheduleTargetType" AS ENUM ('agent', 'orchestration');

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "target_type" "ScheduleTargetType" NOT NULL,
    "agent_id" TEXT,
    "orchestration_id" TEXT,
    "expression" TEXT NOT NULL,
    "input" TEXT,
    "last_fired_at" TIMESTAMP(3),
    "last_fired_slot" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedules_agent_id_idx" ON "schedules"("agent_id");

-- CreateIndex
CREATE INDEX "schedules_orchestration_id_idx" ON "schedules"("orchestration_id");

-- CreateIndex
CREATE INDEX "schedules_enabled_idx" ON "schedules"("enabled");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_orchestration_id_fkey" FOREIGN KEY ("orchestration_id") REFERENCES "orchestrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
