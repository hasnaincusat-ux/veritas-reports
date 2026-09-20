import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { ROLE, type Role } from "./types";

const COOKIE = "vr_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32)
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  return new TextEncoder().encode(s);
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}
export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string, role: Role) {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

async function readToken() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { userId: payload.sub as string, role: payload.role as Role };
  } catch {
    return null;
  }
}

/** Deduped per request — safe to call from many server components. */
export const getCurrentUser = cache(async () => {
  const claims = await readToken();
  if (!claims) return null;

  const user = await db.user.findUnique({
    where: { id: claims.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      credits: true,
      status: true,
      createdAt: true,
      featureShareLinks: true,
      featureApi: true,
      partnerName: true,
    },
  });

  // A suspended or deleted account must not keep a live session.
  if (!user || user.status !== "ACTIVE") return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/**
 * Redirects rather than throws. A layout and its page render concurrently, so
 * throwing here surfaces a 500 in the page even when the layout is already
 * redirecting; redirecting from both is idempotent and always lands the
 * visitor somewhere sensible.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== ROLE.ADMIN) redirect("/dashboard");
  return user;
}
