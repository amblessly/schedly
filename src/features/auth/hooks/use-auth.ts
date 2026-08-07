"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { retry } from "@/lib/retry";
import { useMounted } from "@/lib/use-mounted";

export function useAuth() {
  const { data: session, isPending, refetch } = authClient.useSession();
  // better-auth's useSession hydrates from cookies client-side only, so the
  // server renders a session-less tree. Deferring the session until after
  // mount keeps SSR and the first client render identical (no hydration
  // mismatch), and the name still appears instantly once mounted.
  const mounted = useMounted();
  const router = useRouter();

  const resolvedSession = mounted ? session : null;

  const signUp = useCallback(
    async (data: {
      email: string;
      username: string;
      firstName: string;
      lastName: string;
      password: string;
      birthdate: string;
      sex: string;
    }) => {
      const result = await retry(() => authClient.signUp.email({
        ...data,
        name: `${data.firstName} ${data.lastName}`,
        callbackURL: "/verify-email/success",
      } as Parameters<typeof authClient.signUp.email>[0]));
      return result;
    },
    []
  );

  const signIn = useCallback(
    async (data: { email: string; password: string }) => {
      const result = await retry(() => authClient.signIn.email({
        email: data.email,
        password: data.password,
        callbackURL: "/dashboard",
      }));
      return result;
    },
    []
  );

  const signInSocial = useCallback(
    async (provider: "google" | "github") => {
      // disableRedirect: the server returns the provider URL as JSON instead
      // of a 302. Our fetch can't follow the 302 to Google/GitHub because the
      // CSP connect-src doesn't allow those hosts — so we navigate manually.
      const result = await authClient.signIn.social({
        provider,
        callbackURL: "/dashboard",
        newUserCallbackURL: "/dashboard",
        disableRedirect: true,
      });
      return result as unknown as {
        url?: string;
        error?: string | { code?: string; message?: string };
      };
    },
    []
  );

  const signOut = useCallback(async () => {
    await authClient.signOut();
    router.push("/login");
  }, [router]);

  return {
    user: resolvedSession?.user ?? null,
    session: resolvedSession ?? null,
    isLoading: !mounted || isPending,
    isAuthenticated: !!resolvedSession,
    refetchSession: refetch,
    signUp,
    signIn,
    signInSocial,
    signOut,
  };
}
