-- Authenticated customer-to-platform-support messages.
-- Only platform administrators can query/respond to other users' threads.
CREATE TABLE "SupportThread" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportMessage" (
  "id" UUID NOT NULL,
  "threadId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "body" VARCHAR(1000) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportThread_userId_key" ON "SupportThread"("userId");
CREATE INDEX "SupportThread_updatedAt_idx" ON "SupportThread"("updatedAt");
CREATE INDEX "SupportMessage_threadId_createdAt_idx" ON "SupportMessage"("threadId","createdAt");
ALTER TABLE "SupportThread" ADD CONSTRAINT "SupportThread_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "SupportThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
