import { prisma } from "../src/db";

const BRANCH_IDS = ["UP2W1", "UP2W2", "UP2W3", "UP2W4", "UP2W5", "UP2W6"];
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

async function main() {
  for (const id of BRANCH_IDS) {
    await prisma.branch.upsert({ where: { id }, update: {}, create: { id, name: id } });
  }
  console.log(`🏢 Cabang siap: ${BRANCH_IDS.join(", ")}`);

  const user = await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: {},
    create: { username: ADMIN_USERNAME, password: await Bun.password.hash(ADMIN_PASSWORD) },
  });
  console.log(`👤 User admin siap: ${user.username}${ADMIN_PASSWORD === "admin123" ? " (password default admin123 — segera ganti)" : ""}`);
}

main()
  .catch((error) => {
    console.error("❌ Seeding gagal:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
