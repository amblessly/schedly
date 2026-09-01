const { Client } = require("pg");
const { writeFileSync } = require("fs");

const c = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await c.connect();

  const all = await c.query("SELECT email FROM users ORDER BY created_at");
  const gmail = await c.query("SELECT email FROM users WHERE email LIKE '%@gmail.com' ORDER BY created_at");

  const allLines = [
    "# Schedly all user emails",
    `# Generated: ${new Date().toISOString()}`,
    `# Total: ${all.rowCount}`,
    "",
    ...all.rows.map((u) => u.email),
  ];

  const gmailLines = [
    "# Schedly gmail.com user emails",
    `# Generated: ${new Date().toISOString()}`,
    `# Total: ${gmail.rowCount}`,
    "",
    ...gmail.rows.map((u) => u.email),
  ];

  writeFileSync("users-all-emails.txt", allLines.join("\n"), "utf8");
  writeFileSync("users-gmail-only.txt", gmailLines.join("\n"), "utf8");

  console.log(`All emails: ${all.rowCount} → users-all-emails.txt`);
  console.log(`Gmail only: ${gmail.rowCount} → users-gmail-only.txt`);

  await c.end();
}

main().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
