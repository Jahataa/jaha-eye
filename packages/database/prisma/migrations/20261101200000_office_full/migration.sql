-- AlterTable agents
ALTER TABLE "agents" ADD COLUMN "brief" TEXT;
ALTER TABLE "agents" ADD COLUMN "is_department_lead" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable orchestrations
ALTER TABLE "orchestrations" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable app_settings
ALTER TABLE "app_settings" ADD COLUMN "usage_budget_tokens" INTEGER;

-- CreateEnum
CREATE TYPE "OfficeTaskStatus" AS ENUM ('routing', 'queued', 'running', 'waiting', 'done', 'error', 'cancelled', 'scheduled');
CREATE TYPE "OfficeTaskRunMode" AS ENUM ('normal', 'draft', 'approve', 'revise', 'team');
CREATE TYPE "LessonKind" AS ENUM ('standing', 'oneoff');
CREATE TYPE "BrainNoteKind" AS ENUM ('note', 'deliverable');

-- CreateTable office_tasks
CREATE TABLE "office_tasks" (
    "id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "agent_id" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL,
    "status" "OfficeTaskStatus" NOT NULL DEFAULT 'routing',
    "needs_ok" BOOLEAN NOT NULL DEFAULT false,
    "plan" JSONB NOT NULL DEFAULT '[]',
    "draft" TEXT,
    "result" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "late" BOOLEAN NOT NULL DEFAULT false,
    "routine_id" TEXT,
    "team_parent_run_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "office_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable office_task_runs
CREATE TABLE "office_task_runs" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "mode" "OfficeTaskRunMode" NOT NULL DEFAULT 'normal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "office_task_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable skills
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "agent_ids" JSONB NOT NULL DEFAULT '[]',
    "departments" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable lessons
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "kind" "LessonKind" NOT NULL,
    "text" TEXT NOT NULL,
    "source_task_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable brain_notes
CREATE TABLE "brain_notes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "BrainNoteKind" NOT NULL DEFAULT 'note',
    "agent_id" TEXT,
    "task_id" TEXT,
    "run_id" TEXT,
    "links" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brain_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable routines
CREATE TABLE "routines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "needs_ok" BOOLEAN NOT NULL DEFAULT false,
    "team" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_fired_at" TIMESTAMP(3),
    "last_fired_slot" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable run_usage
CREATE TABLE "run_usage" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT NOT NULL DEFAULT '',
    "estimated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "run_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");
CREATE UNIQUE INDEX "brain_notes_slug_key" ON "brain_notes"("slug");
CREATE UNIQUE INDEX "run_usage_run_id_key" ON "run_usage"("run_id");
CREATE UNIQUE INDEX "office_task_runs_task_id_run_id_key" ON "office_task_runs"("task_id", "run_id");
CREATE INDEX "office_tasks_status_idx" ON "office_tasks"("status");
CREATE INDEX "office_tasks_department_idx" ON "office_tasks"("department");
CREATE INDEX "office_tasks_agent_id_idx" ON "office_tasks"("agent_id");
CREATE INDEX "office_tasks_scheduled_at_idx" ON "office_tasks"("scheduled_at");
CREATE INDEX "office_task_runs_run_id_idx" ON "office_task_runs"("run_id");
CREATE INDEX "lessons_agent_id_idx" ON "lessons"("agent_id");
CREATE INDEX "brain_notes_agent_id_idx" ON "brain_notes"("agent_id");
CREATE INDEX "routines_agent_id_idx" ON "routines"("agent_id");
CREATE INDEX "routines_enabled_idx" ON "routines"("enabled");

-- AddForeignKey
ALTER TABLE "office_tasks" ADD CONSTRAINT "office_tasks_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "office_tasks" ADD CONSTRAINT "office_tasks_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "office_task_runs" ADD CONSTRAINT "office_task_runs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "office_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "office_task_runs" ADD CONSTRAINT "office_task_runs_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "brain_notes" ADD CONSTRAINT "brain_notes_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "brain_notes" ADD CONSTRAINT "brain_notes_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "routines" ADD CONSTRAINT "routines_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "run_usage" ADD CONSTRAINT "run_usage_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
