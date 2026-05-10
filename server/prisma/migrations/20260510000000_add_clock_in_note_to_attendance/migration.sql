DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_records' AND column_name = 'clockInNote') THEN
    ALTER TABLE "attendance_records" ADD COLUMN "clockInNote" TEXT;
  END IF;
END $$;
