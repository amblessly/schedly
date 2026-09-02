"use server";

import { db } from "@/server/db/client";

export type PublicProfile = {
  name: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  school: string | null;
  course: string | null;
  year: number | null;
  city: string | null;
  memberSince: string | null;
} | null;

export async function getPublicProfile(username: string): Promise<PublicProfile> {
  const clean = username.trim().toLowerCase();
  if (!clean) return null;

  const user = await db.user.findUnique({
    where: { username: clean },
    select: {
      name: true,
      username: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      school: true,
      course: true,
      year: true,
      city: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  return {
    name: user.name,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    school: user.school,
    course: user.course,
    year: user.year,
    city: user.city,
    memberSince: user.createdAt
      ? new Date(user.createdAt).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : null,
  };
}
