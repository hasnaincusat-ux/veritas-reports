import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const db = new PrismaClient();

/** Readable but still high-entropy, so a seeded admin is never a weak account. */
function generatePassword() {
  return randomBytes(12).toString("base64url");
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || generatePassword();
  const generated = !process.env.ADMIN_PASSWORD;

  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    await db.user.update({
      where: { email },
      data: { role: "ADMIN", status: "ACTIVE" },
    });
    console.log(`\n  Existing user ${email} promoted to ADMIN (password unchanged).`);
  } else {
    await db.user.create({
      data: {
        email,
        name: "Site Administrator",
        passwordHash: await bcrypt.hash(password, 12),
        role: "ADMIN",
        credits: 25,
      },
    });
    console.log("\n  Admin account created");
    console.log(`  email:    ${email}`);
    console.log(`  password: ${password}`);
    if (generated)
      console.log("  ^ generated — copy it now, it is not stored anywhere else.");
  }

  const reviewCount = await db.review.count();
  if (reviewCount === 0) {
    await db.review.createMany({
      data: [
        {
          name: "Amina K.",
          rating: 5,
          body: "Turned my draft around in under ten minutes and the report was easy to follow. Fixed two citations I had missed entirely.",
          status: "APPROVED",
        },
        {
          name: "Daniel O.",
          rating: 5,
          body: "Clean dashboard, clear scores, and I could download both reports straight away. Exactly what I needed before submitting.",
          status: "APPROVED",
        },
        {
          name: "Priya S.",
          rating: 4,
          body: "Good service and quick support when I had a question about file formats. Would use again.",
          status: "APPROVED",
        },
      ],
    });
    console.log("  Seeded 3 sample reviews (edit or remove them in the admin panel).");
  }

  console.log("\n  Done.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
