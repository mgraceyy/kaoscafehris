-- Rename existing EmploymentStatus enum values to new naming convention
ALTER TYPE "EmploymentStatus" RENAME VALUE 'ACTIVE' TO 'FULL_TIME';
ALTER TYPE "EmploymentStatus" RENAME VALUE 'INACTIVE' TO 'PART_TIME';
ALTER TYPE "EmploymentStatus" RENAME VALUE 'ON_LEAVE' TO 'TRAINEE';
-- TERMINATED stays TERMINATED (no rename needed)
