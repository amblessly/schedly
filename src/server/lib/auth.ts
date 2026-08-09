import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/server/db/client";
import { sendEmail } from "@/server/lib/email";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: true,
        unique: true,
      },
      firstName: {
        type: "string",
        required: true,
      },
      lastName: {
        type: "string",
        required: true,
      },
      birthdate: {
        type: "date",
        required: false,
      },
      sex: {
        type: "string",
        required: false,
      },
      isAdmin: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      avatarUrl: {
        type: "string",
        required: false,
      },
      city: {
        type: "string",
        required: false,
      },
      failedAttempts: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
      lockedUntil: {
        type: "date",
        required: false,
        input: false,
      },
      onboardingCompleted: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    ...(process.env.RESEND_API_KEY
      ? {
          requireEmailVerification: true,
        }
      : {}),
    password: {
      hash: async (password) => {
        const bcrypt = await import("bcryptjs");
        return bcrypt.hash(password, 12);
      },
      verify: async ({ password, hash }) => {
        const bcrypt = await import("bcryptjs");
        return bcrypt.compare(password, hash);
      },
    },
  },
  ...(process.env.RESEND_API_KEY
    ? {
        emailVerification: {
          sendOnSignUp: true,
          sendOnSignIn: true,
          autoSignInAfterVerification: true,
          // The emailOTP plugin overrides this (overrideDefaultEmailVerification)
          // so the email carries a one-time code instead of a clickable link.
          sendVerificationEmail: async () => {},
        },
      }
    : {}),
  ...(process.env.RESEND_API_KEY
    ? {
        plugins: [
          emailOTP({
            otpLength: 6,
            expiresIn: 600, // 10 minutes
            allowedAttempts: 5,
            overrideDefaultEmailVerification: true,
            sendVerificationOTP: async ({ email, otp, type }) => {
              if (type !== "email-verification") return;
              try {
                await sendEmail({
                  to: email,
                  subject: "Your Schedly verification code",
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                      <h1 style="color: #e11d48; font-size: 24px; margin-bottom: 8px;">Verify your email</h1>
                      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Use the code below to verify your Schedly account. It expires in 10 minutes.
                      </p>
                      <div style="background-color: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">
                        ${otp}
                      </div>
                      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                        If you didn't create an account, you can safely ignore this email.
                      </p>
                    </div>
                  `,
                });
              } catch (err) {
                console.error("[Auth] Failed to send OTP email:", err);
              }
            },
          }),
        ],
      }
    : {}),
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/api/auth/sign-in/email": {
        window: 10,
        max: 5,
      },
      "/api/auth/sign-up/email": {
        window: 60,
        max: 3,
      },
      "/api/auth/sign-in/social": {
        window: 10,
        max: 20,
      },
    },
  },
  socialProviders: {},
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Social sign-up (Google/GitHub) doesn't send our required fields.
          // Derive them from the provider profile before the row is inserted.
          const name = (user.name ?? "").trim();
          const email = (user.email ?? "").trim();
          const nameParts = name.split(/\s+/);
          const firstName = nameParts[0] ?? "";
          const lastName = nameParts.slice(1).join(" ") || firstName;

          return {
            data: {
              ...user,
              firstName: firstName || email.split("@")[0] || "User",
              lastName: lastName || "User",
              // username must be unique; derive from email local-part
              username: encodeURIComponent(email.split("@")[0] ?? "user").replace(/[^a-zA-Z0-9_.]/g, "") ||
                `user${Math.random().toString(36).slice(2, 8)}`,
            },
          };
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7,
    },
  },
  advanced: {
    cookies: {
      sessionToken: {
        name: process.env.NODE_ENV === "production" ? "__Host-schedly-session" : "schedly-session",
        attributes: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        },
      },
    },
    ipAddress: {
      ipv6Subnet: 64,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ],
  plugins: [nextCookies()],
});
