CREATE TABLE IF NOT EXISTS "github_connections" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "repo_owner"      TEXT NOT NULL,
  "repo_name"       TEXT NOT NULL,
  "webhook_secret"  TEXT NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "github_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "github_connections_organization_id_key" UNIQUE ("organization_id")
);
