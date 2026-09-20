"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { ApiKeyError, generateApiKey, revokeApiKey, setWebhook } from "@/lib/api-keys";

export type KeyState = { error?: string; success?: string; plaintext?: string } | null;

async function requireApiFeature() {
  const user = await getCurrentUser();
  if (!user) return null;
  const flags = await db.user.findUnique({
    where: { id: user.id },
    select: { featureApi: true },
  });
  return flags?.featureApi ? user : null;
}

export async function generateApiKeyAction(
  _prev: KeyState,
  formData: FormData,
): Promise<KeyState> {
  const user = await requireApiFeature();
  if (!user) return { error: "API access is not enabled on your account." };

  try {
    const { key, record } = await generateApiKey(
      user.id,
      String(formData.get("label") ?? ""),
    );
    await audit(user.id, "apikey.create", { type: "ApiKey", id: record.id });
    revalidatePath("/dashboard/api");
    // The only time the full key is ever visible.
    return {
      success: "Key created. Copy it now — it will not be shown again.",
      plaintext: key,
    };
  } catch (err) {
    if (err instanceof ApiKeyError) return { error: err.message };
    throw err;
  }
}

export async function revokeApiKeyAction(keyId: string) {
  const user = await requireApiFeature();
  if (!user) throw new Error("FORBIDDEN");

  await revokeApiKey(user.id, keyId);
  await audit(user.id, "apikey.revoke", { type: "ApiKey", id: keyId });
  revalidatePath("/dashboard/api");
}

export async function setWebhookAction(
  _prev: KeyState,
  formData: FormData,
): Promise<KeyState> {
  const user = await requireApiFeature();
  if (!user) return { error: "API access is not enabled on your account." };

  const keyId = String(formData.get("keyId") ?? "");
  const url = String(formData.get("webhookUrl") ?? "").trim();

  try {
    await setWebhook(user.id, keyId, url || null);
  } catch (err) {
    if (err instanceof ApiKeyError) return { error: err.message };
    throw err;
  }

  revalidatePath("/dashboard/api");
  return {
    success: url ? "Webhook saved." : "Webhook removed — the key will use polling.",
  };
}
