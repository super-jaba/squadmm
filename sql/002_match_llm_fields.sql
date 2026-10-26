-- LLM judge output: which history items it cited, and which model/prompt produced the match
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS evidence        text[];
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS model           text;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "promptVersion" text;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "updatedAt"     timestamp(3);
