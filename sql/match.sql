CREATE TABLE "Match" (
  id          text PRIMARY KEY DEFAULT gen_random_uuid(),
  "roleId"    text NOT NULL REFERENCES "Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "userId"    text NOT NULL REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reasoning   text,
  strength    text NOT NULL, -- STRONG | MEDIUM | WEAK, validated by the MatchStrength zod enum
  CONSTRAINT "Match_roleId_userId_key" UNIQUE ("roleId", "userId")
);

CREATE INDEX "Match_userId_idx" ON "Match" ("userId");
