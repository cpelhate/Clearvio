-- F3: Suivi du temps estimé / passé
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "estimated_time" INTEGER;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "time_spent" INTEGER;
