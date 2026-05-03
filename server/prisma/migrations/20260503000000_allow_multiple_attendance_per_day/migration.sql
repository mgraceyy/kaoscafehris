-- Allow employees with 2 shifts on the same day to have 2 attendance records.
-- The application layer now enforces the limit (max records = scheduled shift count).
DROP INDEX IF EXISTS "attendance_records_employeeId_date_key";
