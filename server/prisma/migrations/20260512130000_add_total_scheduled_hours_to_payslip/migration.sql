-- Safe-add column that may already exist from a prior prisma db push
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Payslip' AND column_name = 'totalScheduledHours'
  ) THEN
    ALTER TABLE "Payslip" ADD COLUMN "totalScheduledHours" DECIMAL(8,2) NOT NULL DEFAULT 0;
  END IF;
END $$;
