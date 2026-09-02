import Image from "next/image";
import Link from "next/link";
import { GraduationCap, BookOpen, Award, MapPin, Calendar } from "lucide-react";
import { getPublicProfile } from "@/app/(dashboard)/profile/public-actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl font-bold text-primary/50">
          ?
        </div>
        <h1 className="mt-4 text-xl font-bold text-foreground">Profile not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We couldn&apos;t find a profile for @{username}.
        </p>
        <Link href="/" className="mt-5">
          <Button variant="outline">Go to Schedly</Button>
        </Link>
      </div>
    );
  }

  const initials = (profile.firstName || "U").charAt(0).toUpperCase();
  const fullName = profile.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile.firstName || profile.name;
  const yearLabel =
    profile.year != null
      ? `${profile.year}${
          profile.year % 100 >= 11 && profile.year % 100 <= 13
            ? "th"
            : ["st", "nd", "rd"][(profile.year % 10) - 1] || "th"
        } yr`
      : null;
  const isRemote =
    !!profile.avatarUrl &&
    profile.avatarUrl.startsWith("https") &&
    !profile.avatarUrl.startsWith("data:");
  const avatarSrc =
    !!profile.avatarUrl && profile.avatarUrl.startsWith("/")
      ? profile.avatarUrl
      : profile.avatarUrl;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-[0_12px_32px_-12px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col items-center px-6 pb-4 pt-8 text-center">
          <div className="relative h-24 w-24">
            {avatarSrc && !isRemote ? (
              <img
                src={avatarSrc}
                alt={fullName}
                className="h-full w-full rounded-full object-cover ring-2 ring-border"
              />
            ) : avatarSrc && isRemote ? (
              <Image
                src={avatarSrc}
                alt={fullName}
                width={96}
                height={96}
                className="h-full w-full rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-4xl font-bold text-primary">
                {initials}
              </div>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-bold text-foreground">{fullName}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>

          <div className="mt-4 flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
            {profile.school && (
              <div className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span>{profile.school}</span>
              </div>
            )}
            {profile.course && (
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>{profile.course}</span>
              </div>
            )}
            {yearLabel && (
              <div className="flex items-center gap-1.5">
                <Award className="h-4 w-4 text-primary" />
                <span>{yearLabel}</span>
              </div>
            )}
            {profile.city && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{profile.city}</span>
              </div>
            )}
            {profile.memberSince && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Member since {profile.memberSince}</span>
              </div>
            )}
          </div>

          <p className="mt-5 text-xs text-muted-foreground/70">on Schedly</p>
        </div>
      </div>
    </div>
  );
}
