import "dotenv/config";
import { config as loadEnvSecret } from "dotenv";
loadEnvSecret({ path: ".env.secret" });
import { initializeApp, getApps, cert } from "firebase-admin";
import { getMessaging } from "firebase-admin/messaging";
import { db } from "./src/server/db/client";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID!;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL!;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n");
if (getApps().length === 0) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });

const tokens = await db.fCMToken.findMany({ where: { user: { email: "luisonblessly@gmail.com" } } });
console.log("tokens:", tokens.length);

const marker = "DIAG-" + Date.now().toString().slice(-6);
for (let i = 0; i < 2; i++) {
  try {
    const res = await getMessaging().send({
      token: tokens[0]!.token,
      data: {
        title: `Schedly 🔔 ${marker}-${i + 1}`,
        body: "Diagnostic push — kung nakita mo ito, gumagana na!",
        url: "/notifications",
        tag: `diag-${marker}-${i}`,
      },
      webpush: { headers: { Urgency: "high" } },
    });
    console.log(`SENT [${i + 1}] →`, res, "| marker:", marker);
  } catch (e: any) {
    console.log(`[${i + 1}] FAILED →`, e.code || e.message);
  }
  await new Promise((r) => setTimeout(r, 500));
}
console.log("MARKER=", marker);
await db.$disconnect();
