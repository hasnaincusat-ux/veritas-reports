"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export type PublicState = { error?: string; success?: string } | null;

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  subject: z.string().trim().min(3, "Add a short subject."),
  message: z.string().trim().min(10, "Tell us a little more so we can help."),
});

export async function sendContactMessageAction(
  _prev: PublicState,
  formData: FormData,
): Promise<PublicState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Check your message." };

  await db.contactMessage.create({ data: parsed.data });
  revalidatePath("/admin/messages");

  return { success: "Message sent. We usually reply within a few hours." };
}

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10, "Tell us a little about your experience."),
});

/**
 * Reviews land as PENDING and only appear on the marketing page once an admin
 * approves them, so the homepage cannot be used as an open posting board.
 */
export async function submitReviewAction(
  _prev: PublicState,
  formData: FormData,
): Promise<PublicState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to leave a review." };

  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating"),
    body: formData.get("body"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Check your review." };

  await db.review.create({
    data: {
      userId: user.id,
      name: user.name,
      rating: parsed.data.rating,
      body: parsed.data.body,
    },
  });
  revalidatePath("/admin/reviews");

  return { success: "Thanks! Your review will appear once it is approved." };
}
