"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { retry } from "@/lib/retry";
import { useMounted } from "@/lib/use-mounted";
import { cacheRead, cacheWrite, isOffline } from "@/lib/offline-cache";

type CachedUser = Record<string, unknown> & {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  image?: string;
};

export function useAuth() {
  const { data: session, isPending, refetch } = authClient.useSession();
  // better-auth's useSession hydrates from cookies client-side only, so the
  // server renders a session-less tree. Deferring the session until after
  // mount keeps SSR and the first client render identical (no hydration
  // mismatch), and the name still appears instantly once mounted.
  const mounted = useMounted();
  const router = useRouter();

  // Offline fallback: persist the signed-in user so the greeting, name, and
  // avatar still show without a connection. The session fetch fails offline,
  // so server-rendered pages would otherwise fall back to "there" and a
  // missing photo.
  const [offlineUser, setOfflineUser] = useState<CachedUser | null>(null);
  const [offlineSettled, setOfflineSettled] = useState(false);

  const resolvedSession = mounted ? session : null;
  const user = resolvedSession?.user ?? offlineUser;

  useEffect(() => {
    if (!mounted) return;
    if (resolvedSession?.user) {
      const u = resolvedSession.user as CachedUser;
      cacheWrite("session:user", {
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        image: u.image,
      }).catch(() => {});
      return;
    }
    if (!isPending && isOffline()) {
      cacheRead<CachedUser>("session:user")
        .then((cached) => {
          if (cached) {
            setOfflineUser(cached);
            // Reconcile greeting with the possibly-stale cached photo.
            setOfflineSettled(true);
          }
        })
        .catch(() => {})
        .finally(() => setOfflineSettled(true));
    }
  }, [mounted, resolvedSession, isPending]);

  const signUp = useCallback(
    async (data: {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
      school?: string;
      course?: string;
      year?: string;
    }) => {
      const result = await retry(() => authClient.signUp.email({
        ...data,
        name: `${data.firstName} ${data.lastName}`,
        year: data.year && !isNaN(Number(data.year)) ? Number(data.year) : undefined,
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
      // better-auth client returns `{ data, error }`.
      const data = (result as { data?: { url?: string } }).data;
      const error = (result as {
        error?: string | { code?: string; message?: string };
      }).error;
      return { url: data?.url, error };
    },
    []
  );

  const signOut = useCallback(async () => {
    await authClient.signOut();
    router.push("/login");
  }, [router]);

  return {
    user: user ?? null,
    session: resolvedSession ?? null,
    // Offline: the session fetch fails, but we're "settled" once the cache
    // has been checked — pages then render the cached user instead of
    // spinning forever.
    isLoading: !mounted || (isPending && !offlineSettled),
    isAuthenticated: !!resolvedSession || !!offlineUser,
    refetchSession: refetch,
    signUp,
    signIn,
    signInSocial,
    signOut,
  };
}
