import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed data will be added per module
  console.log("Seeding database...");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
