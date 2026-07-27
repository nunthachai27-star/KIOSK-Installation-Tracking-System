-- Record submitter IP on borrow requests (audit + rate limiting).
ALTER TABLE "LoanRequest" ADD COLUMN IF NOT EXISTS "ip" TEXT;
CREATE INDEX IF NOT EXISTS "LoanRequest_ip_createdAt_idx" ON "LoanRequest"("ip", "createdAt");
