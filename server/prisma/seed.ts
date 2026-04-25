import { PrismaClient, Role, EmploymentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);

async function main() {
  console.log("Cleaning database...");

  // Delete in reverse FK dependency order
  await prisma.auditLog.deleteMany();
  await prisma.payslipDeduction.deleteMany();
  await prisma.payslipEarning.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.overtimeRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.shiftType.deleteMany();
  await prisma.deduction.deleteMany();
  await prisma.publicHoliday.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.governmentTable.deleteMany();

  console.log("Clean. Seeding admin account...");

  // --- Admin user -----------------------------------------------------------
  const adminPassword = await bcrypt.hash("kaosadmin", BCRYPT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      email: "admin@kaos.com",
      password: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // A branch is required for the employee profile FK
  const branch = await prisma.branch.create({
    data: {
      name: "KAOS Cafe — Main",
      address: "TBD",
      city: "TBD",
      isActive: true,
    },
  });

  await prisma.employee.create({
    data: {
      employeeId: "KAOS-0000",
      userId: admin.id,
      branchId: branch.id,
      firstName: "JM",
      lastName: "Mendoza",
      position: "Administrator",
      employmentStatus: EmploymentStatus.ACTIVE,
      dateHired: new Date("2024-01-01"),
      basicSalary: 0,
    },
  });

  // --- Government contribution tables (Philippines 2024) -------------------
  const effectiveDate = new Date("2024-01-01T00:00:00.000Z");

  const sssRows = [
    { rangeFrom: 0,     rangeTo: 3999.99,    employeeShare: 180.0,   employerShare: 380.0   },
    { rangeFrom: 4000,  rangeTo: 6999.99,    employeeShare: 292.5,   employerShare: 617.5   },
    { rangeFrom: 7000,  rangeTo: 9999.99,    employeeShare: 382.5,   employerShare: 807.5   },
    { rangeFrom: 10000, rangeTo: 12999.99,   employeeShare: 562.5,   employerShare: 1187.5  },
    { rangeFrom: 13000, rangeTo: 15999.99,   employeeShare: 697.5,   employerShare: 1472.5  },
    { rangeFrom: 16000, rangeTo: 18999.99,   employeeShare: 832.5,   employerShare: 1757.5  },
    { rangeFrom: 19000, rangeTo: 21999.99,   employeeShare: 967.5,   employerShare: 2042.5  },
    { rangeFrom: 22000, rangeTo: 24999.99,   employeeShare: 1102.5,  employerShare: 2327.5  },
    { rangeFrom: 25000, rangeTo: 27999.99,   employeeShare: 1237.5,  employerShare: 2612.5  },
    { rangeFrom: 28000, rangeTo: 29499.99,   employeeShare: 1305.0,  employerShare: 2755.0  },
    { rangeFrom: 29500, rangeTo: 9999999.99, employeeShare: 1327.5,  employerShare: 2802.5  },
  ];

  const philhealthRows = [
    { rangeFrom: 0,      rangeTo: 9999.99,    employeeShare: 250.0,  employerShare: 250.0  },
    { rangeFrom: 10000,  rangeTo: 14999.99,   employeeShare: 300.0,  employerShare: 300.0  },
    { rangeFrom: 15000,  rangeTo: 19999.99,   employeeShare: 437.5,  employerShare: 437.5  },
    { rangeFrom: 20000,  rangeTo: 24999.99,   employeeShare: 562.5,  employerShare: 562.5  },
    { rangeFrom: 25000,  rangeTo: 29999.99,   employeeShare: 687.5,  employerShare: 687.5  },
    { rangeFrom: 30000,  rangeTo: 39999.99,   employeeShare: 875.0,  employerShare: 875.0  },
    { rangeFrom: 40000,  rangeTo: 59999.99,   employeeShare: 1250.0, employerShare: 1250.0 },
    { rangeFrom: 60000,  rangeTo: 99999.99,   employeeShare: 2000.0, employerShare: 2000.0 },
    { rangeFrom: 100000, rangeTo: 9999999.99, employeeShare: 2500.0, employerShare: 2500.0 },
  ];

  const pagibigRows = [
    { rangeFrom: 0,    rangeTo: 1499.99,    employeeShare: 15.0,  employerShare: 30.0  },
    { rangeFrom: 1500, rangeTo: 4999.99,    employeeShare: 75.0,  employerShare: 100.0 },
    { rangeFrom: 5000, rangeTo: 9999999.99, employeeShare: 100.0, employerShare: 100.0 },
  ];

  const birRows = [
    { rangeFrom: 0,      rangeTo: 20832.99,   employeeShare: 0,      employerShare: 0 },
    { rangeFrom: 20833,  rangeTo: 33332.99,   employeeShare: 833,    employerShare: 0 },
    { rangeFrom: 33333,  rangeTo: 66666.99,   employeeShare: 4167,   employerShare: 0 },
    { rangeFrom: 66667,  rangeTo: 166666.99,  employeeShare: 20000,  employerShare: 0 },
    { rangeFrom: 166667, rangeTo: 666666.99,  employeeShare: 65000,  employerShare: 0 },
    { rangeFrom: 666667, rangeTo: 9999999.99, employeeShare: 200000, employerShare: 0 },
  ];

  const tableSeeds: Array<{ type: string; rows: typeof sssRows }> = [
    { type: "SSS",        rows: sssRows        },
    { type: "PHILHEALTH", rows: philhealthRows  },
    { type: "PAGIBIG",    rows: pagibigRows     },
    { type: "BIR",        rows: birRows         },
  ];

  for (const { type, rows } of tableSeeds) {
    await prisma.governmentTable.createMany({
      data: rows.map((r) => ({ ...r, type, effectiveDate })),
    });
    console.log(`  Seeded ${rows.length} ${type} rows`);
  }

  console.log("\nSeed complete.");
  console.log("  Admin — admin@kaos.com / kaosadmin");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
