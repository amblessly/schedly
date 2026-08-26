import "dotenv/config";
import { db } from "./src/server/db/client";
const diags = await db.notification.findMany({ where: { title: "PUSH-DIAG" }, orderBy: { createdAt: "desc" }, take: 10 });
console.log("PUSH-DIAG rows:", diags.length);
for (const d of diags) console.log(`  ${d.createdAt.toISOString()} | ${d.body.slice(0, 300)}`);
await db.$disconnect();
