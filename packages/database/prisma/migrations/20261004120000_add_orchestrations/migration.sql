-- CreateEnum
CREATE TYPE "OrchestrationStatus" AS ENUM ('active', 'disabled');

-- CreateTable
CREATE TABLE "orchestrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "OrchestrationStatus" NOT NULL DEFAULT 'active',
    "graph" JSONB NOT NULL,
    "default_run_input" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orchestrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orchestrations_slug_key" ON "orchestrations"("slug");

-- AlterTable
ALTER TABLE "agent_runs" ALTER COLUMN "agent_id" DROP NOT NULL;

ALTER TABLE "agent_runs" ADD COLUMN "orchestration_id" TEXT;
ALTER TABLE "agent_runs" ADD COLUMN "graph_node_id" TEXT;

-- CreateIndex
CREATE INDEX "agent_runs_orchestration_id_idx" ON "agent_runs"("orchestration_id");
CREATE INDEX "agent_runs_parent_run_id_idx" ON "agent_runs"("parent_run_id");

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_orchestration_id_fkey" FOREIGN KEY ("orchestration_id") REFERENCES "orchestrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
