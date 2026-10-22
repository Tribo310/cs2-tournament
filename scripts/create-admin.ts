/**
 * Creates an admin user, or resets the password of an existing one.
 *
 *   pnpm admin:create <username> [--allow-weak-password]
 *
 * The password is read from the ADMIN_PASSWORD env var, or prompted for.
 * Passwords shorter than 10 characters are refused unless --allow-weak-password is given.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { hashPassword } from "../src/lib/auth/password";
import { isValidUsername, normalizeUsername } from "../src/lib/auth/username";
import { closeDb, collections } from "../src/lib/db/mongo";

const MIN_PASSWORD_LENGTH = 10;

async function main() {
  const args = process.argv.slice(2);
  const allowWeak = args.includes("--allow-weak-password");
  const username = normalizeUsername(args.find((a) => !a.startsWith("--")));
  if (!isValidUsername(username)) {
    console.error("Usage: pnpm admin:create <username> [--allow-weak-password]");
    console.error("Username: 2-32 characters, Latin letters, digits, '.', '_' or '-'.");
    process.exitCode = 1;
    return;
  }

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    const rl = createInterface({ input: stdin, output: stdout });
    password = await rl.question(`Password for ${username}: `);
    rl.close();
  }
  if (!password) {
    console.error("Password must not be empty.");
    process.exitCode = 1;
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    if (!allowWeak) {
      console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters (or pass --allow-weak-password).`);
      process.exitCode = 1;
      return;
    }
    console.warn(`WARNING: weak password for "${username}" — change it before the site goes public.`);
  }

  const { admins } = await collections();
  const passwordHash = await hashPassword(password);
  const res = await admins.updateOne(
    { username },
    { $set: { passwordHash }, $setOnInsert: { username, createdAt: new Date() } },
    { upsert: true },
  );
  console.log(res.upsertedCount ? `Admin created: ${username}` : `Password updated: ${username}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
