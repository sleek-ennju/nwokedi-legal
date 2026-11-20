// Create or remove a dashboard admin.
//
//   node scripts/admin-user.mjs add her@example.com      → asks for a password (hidden), creates the
//                                                         account (or resets its password) and grants admin
//   node scripts/admin-user.mjs remove her@example.com   → revokes admin and deletes the account
//   node scripts/admin-user.mjs reset-2fa her@example.com → removes the authenticator, so the next
//                                                         sign-in sets it up again (lost phone)
//   node scripts/admin-user.mjs name her@example.com Miriam → the name the dashboard greets them by
//                                                         (takes effect at their next sign-in)
//
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local. The password can also come from
// the ADMIN_PASSWORD environment variable (for scripted test setups). It is never printed.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
const [cmd, rawEmail, ...rest] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();
if (!["add", "remove", "reset-2fa", "name"].includes(cmd) || !email?.includes("@")) {
  console.log("usage: node scripts/admin-user.mjs add|remove|reset-2fa <email>\n       node scripts/admin-user.mjs name <email> <display name>");
  process.exit(1);
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUser(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u || data.users.length < 200) return u ?? null;
  }
  return null;
}

function askHidden(q) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => rl.output.write(s.includes(q) ? s : "");
    rl.question(q, (a) => (rl.close(), process.stdout.write("\n"), resolve(a)));
  });
}

if (cmd === "add") {
  const password = process.env.ADMIN_PASSWORD || (await askHidden("Password (12+ characters): "));
  if (password.length < 12) (console.log("Password must be at least 12 characters."), process.exit(1));
  let user = await findUser(email);
  if (user) {
    const { error } = await sb.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) throw error;
    console.log("Existing account: password updated.");
  } else {
    const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    user = data.user;
    console.log("Account created.");
  }
  const { error } = await sb.from("admins").upsert({ user_id: user.id });
  if (error) throw error;
  console.log(`${email} is an admin. On first sign-in they'll set up an authenticator app.`);
}

if (cmd === "remove") {
  const user = await findUser(email);
  if (!user) (console.log("No such account."), process.exit(0));
  await sb.from("admins").delete().eq("user_id", user.id);
  const { error } = await sb.auth.admin.deleteUser(user.id);
  if (error) throw error;
  console.log(`${email} removed.`);
}

if (cmd === "reset-2fa") {
  const user = await findUser(email);
  if (!user) (console.log("No such account."), process.exit(0));
  const { data, error } = await sb.auth.admin.mfa.listFactors({ userId: user.id });
  if (error) throw error;
  for (const f of data.factors) await sb.auth.admin.mfa.deleteFactor({ userId: user.id, id: f.id });
  console.log(`Removed ${data.factors.length} authenticator(s). Next sign-in will set one up again.`);
}

if (cmd === "name") {
  const name = rest.join(" ").trim().slice(0, 60);
  if (!name) (console.log("Give a display name, e.g. Miriam"), process.exit(1));
  const user = await findUser(email);
  if (!user) (console.log("No such account."), process.exit(0));
  const { error } = await sb.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, name } });
  if (error) throw error;
  console.log(`The dashboard will greet ${email} as "${name}" from their next sign-in.`);
}
