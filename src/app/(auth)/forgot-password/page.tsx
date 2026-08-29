"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Spinner } from "@/components/ui/spinner";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await forgotPassword(email.trim());
      if (result.error) {
        setError(result.error.message || "Something went wrong");
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="border-border/50 shadow-lg shadow-primary/5">
        <CardHeader className="pb-4 text-center">
          <Image
            src="/images/logo.jpg"
            alt=""
            aria-hidden
            width={48}
            height={48}
            className="mx-auto mb-3 h-12 w-12 rounded-xl object-cover shadow-lg shadow-primary/20"
          />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <h1 className="mt-3 text-xl font-bold">Check your email</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We sent a password reset link to <strong>{email}</strong>.
            Click the link in your inbox to set a new password.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </Button>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
              className="block w-full text-sm text-muted-foreground hover:text-foreground"
            >
              Try a different email
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-lg shadow-primary/5">
      <CardHeader className="pb-4 text-center">
        <Image
          src="/images/logo.jpg"
          alt=""
          aria-hidden
          width={48}
          height={48}
          className="mx-auto mb-3 h-12 w-12 rounded-xl object-cover shadow-lg shadow-primary/20"
        />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-3 text-xl font-bold">Forgot your password?</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            autoFocus
          />

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner size={16} color="var(--secondary-foreground)" />
                Sending...
              </span>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
