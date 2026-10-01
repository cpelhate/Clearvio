-- Migration: rattachement tâches-jalons et livrables-tâches
-- À exécuter via Supabase SQL editor ou `prisma db push`

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS milestone_id TEXT REFERENCES milestones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);

ALTER TABLE deliverables
  ADD COLUMN IF NOT EXISTS task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deliverables_task_id ON deliverables(task_id);
