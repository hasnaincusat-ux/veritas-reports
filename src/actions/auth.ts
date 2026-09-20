"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { grantCredits } from "@/lib/credits";
import { CREDIT_REASON, ROLE } from "@/lib/types";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

export type FormState = { error?: string; success?: string } | null;

const SIGNUP_BONUS_CREDITS = 1;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };

  const { name, email, phone, password } = parsed.data;

  if (await db.user.findUnique({ where: { email }, select: { id: true } }))
    return { error: "An account with that email already exists." };

  const user = await db.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash: await hashPassword(password),
      role: ROLE.USER,
    },
    select: { id: true, role: true },
  });

  await grantCredits(user.id, SIGNUP_BONUS_CREDITS, {
    reason: CREDIT_REASON.SIGNUP_BONUS,
    note: "Welcome credit",
  });
  await audit(user.id, "user.register", { type: "User", id: user.id });
  await createSession(user.id, ROLE.USER);

  redirect("/dashboard");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, role: true, status: true },
  });

  // One message for every failure mode, so the form cannot be used to discover
  // which email addresses have accounts.
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) return { error: "Incorrect email or password." };

  if (user.status !== "ACTIVE")
    return { error: "This account is suspended. Contact support for help." };

  await audit(user.id, "user.login", { type: "User", id: user.id });
  await createSession(user.id, user.role as "USER" | "ADMIN");

  redirect(user.role === ROLE.ADMIN ? "/admin" : "/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await audit(user.id, "user.logout", { type: "User", id: user.id });
  await destroySession();
  redirect("/login");
}

const passwordChangeSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z.string().min(8, "New password must be at least 8 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    message: "The new passwords do not match.",
  });

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };

  const parsed = passwordChangeSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };

  const record = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!(await verifyPassword(parsed.data.current, record.passwordHash)))
    return { error: "Your current password is incorrect." };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.next) },
  });
  await audit(user.id, "user.password_change", { type: "User", id: user.id });

  return { success: "Password updated." };
}

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (name.length < 2) return { error: "Please enter your full name." };

  await db.user.update({
    where: { id: user.id },
    data: { name, phone: phone || null },
  });

  return { success: "Profile updated." };
}
