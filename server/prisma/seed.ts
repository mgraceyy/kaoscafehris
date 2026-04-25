import { PrismaClient, Role, EmploymentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);

async function main() {
  console.log("Seeding database...");

  // --- Branch -----------------------------------------------------------
  const branch = await prisma.branch.upsert({
    where: { name: "KAOS Cafe — Main" },
    update: {},
    create: {
      name: "KAOS Cafe — Main",
      address: "123 Sample St.",
      city: "Quezon City",
      phone: "+63 917 000 0000",
    },
  });

  // --- Users ------------------------------------------------------------
  const adminPassword = await bcrypt.hash("Admin@1234", BCRYPT_ROUNDS);
  const managerPassword = await bcrypt.hash("Manager@1234", BCRYPT_ROUNDS);
  const employeePassword = await bcrypt.hash("Employee@1234", BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: "admin@kaoscafe.local" },
    update: { password: adminPassword, role: Role.ADMIN, isActive: true },
    create: {
      email: "admin@kaoscafe.local",
      password: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: "manager@kaoscafe.local" },
    update: { password: managerPassword, role: Role.MANAGER, isActive: true },
    create: {
      email: "manager@kaoscafe.local",
      password: managerPassword,
      role: Role.MANAGER,
      isActive: true,
    },
  });

  const employeeUser = await prisma.user.upsert({
    where: { email: "employee@kaoscafe.local" },
    update: { password: employeePassword, role: Role.EMPLOYEE, isActive: true },
    create: {
      email: "employee@kaoscafe.local",
      password: employeePassword,
      role: Role.EMPLOYEE,
      isActive: true,
    },
  });

  // --- Employee profiles for admin + manager + staff ---------------------------
  await prisma.employee.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      employeeId: "KAOS-0000",
      userId: admin.id,
      branchId: branch.id,
      firstName: "Grace",
      lastName: "Santos",
      position: "Owner",
      employmentStatus: EmploymentStatus.ACTIVE,
      dateHired: new Date("2023-01-01"),
      basicSalary: 50000,
    },
  });

  await prisma.employee.upsert({
    where: { userId: managerUser.id },
    update: {},
    create: {
      employeeId: "KAOS-0001",
      userId: managerUser.id,
      branchId: branch.id,
      firstName: "Maria",
      lastName: "Santos",
      position: "Branch Manager",
      employmentStatus: EmploymentStatus.ACTIVE,
      dateHired: new Date("2024-01-15"),
      basicSalary: 35000,
    },
  });

  await prisma.employee.upsert({
    where: { userId: employeeUser.id },
    update: {},
    create: {
      employeeId: "KAOS-0002",
      userId: employeeUser.id,
      branchId: branch.id,
      firstName: "Juan",
      lastName: "Dela Cruz",
      position: "Barista",
      employmentStatus: EmploymentStatus.ACTIVE,
      dateHired: new Date("2024-03-01"),
      basicSalary: 18000,
    },
  });

  // --- Government contribution tables (Philippines 2024) -------------------
  const effectiveDate = new Date("2024-01-01T00:00:00.000Z");

  // SSS 2024: Employee 4.5%, Employer 9.5% of Monthly Salary Credit
  const sssRows = [
    { rangeFrom: 0, rangeTo: 3999.99, employeeShare: 180.0, employerShare: 380.0 },
    { rangeFrom: 4000, rangeTo: 6999.99, employeeShare: 292.5, employerShare: 617.5 },
    { rangeFrom: 7000, rangeTo: 9999.99, employeeShare: 382.5, employerShare: 807.5 },
    { rangeFrom: 10000, rangeTo: 12999.99, employeeShare: 562.5, employerShare: 1187.5 },
    { rangeFrom: 13000, rangeTo: 15999.99, employeeShare: 697.5, employerShare: 1472.5 },
    { rangeFrom: 16000, rangeTo: 18999.99, employeeShare: 832.5, employerShare: 1757.5 },
    { rangeFrom: 19000, rangeTo: 21999.99, employeeShare: 967.5, employerShare: 2042.5 },
    { rangeFrom: 22000, rangeTo: 24999.99, employeeShare: 1102.5, employerShare: 2327.5 },
    { rangeFrom: 25000, rangeTo: 27999.99, employeeShare: 1237.5, employerShare: 2612.5 },
    { rangeFrom: 28000, rangeTo: 29499.99, employeeShare: 1305.0, employerShare: 2755.0 },
    { rangeFrom: 29500, rangeTo: 9999999.99, employeeShare: 1327.5, employerShare: 2802.5 },
  ];

  // PhilHealth 2024: 5% total (2.5% each); floor ₱250, ceiling ₱2,500 per side
  const philhealthRows = [
    { rangeFrom: 0, rangeTo: 9999.99, employeeShare: 250.0, employerShare: 250.0 },
    { rangeFrom: 10000, rangeTo: 14999.99, employeeShare: 300.0, employerShare: 300.0 },
    { rangeFrom: 15000, rangeTo: 19999.99, employeeShare: 437.5, employerShare: 437.5 },
    { rangeFrom: 20000, rangeTo: 24999.99, employeeShare: 562.5, employerShare: 562.5 },
    { rangeFrom: 25000, rangeTo: 29999.99, employeeShare: 687.5, employerShare: 687.5 },
    { rangeFrom: 30000, rangeTo: 39999.99, employeeShare: 875.0, employerShare: 875.0 },
    { rangeFrom: 40000, rangeTo: 59999.99, employeeShare: 1250.0, employerShare: 1250.0 },
    { rangeFrom: 60000, rangeTo: 99999.99, employeeShare: 2000.0, employerShare: 2000.0 },
    { rangeFrom: 100000, rangeTo: 9999999.99, employeeShare: 2500.0, employerShare: 2500.0 },
  ];

  // PagIBIG/HDMF 2024: max ₱100/month each side
  const pagibigRows = [
    { rangeFrom: 0, rangeTo: 1499.99, employeeShare: 15.0, employerShare: 30.0 },
    { rangeFrom: 1500, rangeTo: 4999.99, employeeShare: 75.0, employerShare: 100.0 },
    { rangeFrom: 5000, rangeTo: 9999999.99, employeeShare: 100.0, employerShare: 100.0 },
  ];

  // BIR 2024 (TRAIN law, monthly withholding; employer share = 0).
  // Amounts are approximate midpoints per bracket — admin should verify per employee.
  const birRows = [
    { rangeFrom: 0, rangeTo: 20832.99, employeeShare: 0, employerShare: 0 },
    { rangeFrom: 20833, rangeTo: 33332.99, employeeShare: 833, employerShare: 0 },
    { rangeFrom: 33333, rangeTo: 66666.99, employeeShare: 4167, employerShare: 0 },
    { rangeFrom: 66667, rangeTo: 166666.99, employeeShare: 20000, employerShare: 0 },
    { rangeFrom: 166667, rangeTo: 666666.99, employeeShare: 65000, employerShare: 0 },
    { rangeFrom: 666667, rangeTo: 9999999.99, employeeShare: 200000, employerShare: 0 },
  ];

  const tableSeeds: Array<{ type: string; rows: typeof sssRows }> = [
    { type: "SSS", rows: sssRows },
    { type: "PHILHEALTH", rows: philhealthRows },
    { type: "PAGIBIG", rows: pagibigRows },
    { type: "BIR", rows: birRows },
  ];
  for (const { type, rows } of tableSeeds) {
    const existing = await prisma.governmentTable.count({ where: { type } });
    if (existing === 0) {
      await prisma.governmentTable.createMany({
        data: rows.map((r) => ({ ...r, type, effectiveDate })),
      });
      console.log(`  Seeded ${rows.length} ${type} rows`);
    }
  }

  console.log("Seed complete.");
  console.log("  Admin     — admin@kaoscafe.local     / Admin@1234");
  console.log("  Manager   — manager@kaoscafe.local   / Manager@1234");
  console.log("  Employee  — employee@kaoscafe.local  / Employee@1234");
  console.log(`  Admin id=${admin.id}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
