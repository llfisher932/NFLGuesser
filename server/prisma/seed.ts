import prisma from "../src/db.js";
import { generatePassword, hashPassword } from "../src/passwords.js";

/**
 * Creates the admin account, once. Everyone else is added from the admin
 * dashboard. Re-running is safe: an existing admin is left alone, password
 * included, because the password is only ever printed here.
 */

const username = (process.env.ADMIN_USERNAME ?? "logan").trim().toLowerCase();
const displayName = process.env.ADMIN_DISPLAY_NAME ?? "Logan";

async function main() {
  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    if (!existing.isAdmin) await prisma.user.update({ where: { username }, data: { isAdmin: true } });
    console.log(`"${username}" already exists. Its password was left alone.`);
    return;
  }

  const password = generatePassword();
  await prisma.user.create({
    data: { username, displayName, isAdmin: true, passwordHash: await hashPassword(password) },
  });

  console.log("\nAdmin account created. Copy this now, it is not recoverable:\n");
  console.log(`  username  ${username}`);
  console.log(`  password  ${password}\n`);
  console.log("Change it from the Account page after you sign in.\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
