import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "hongsmu_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7일

function generateToken(password: string): string {
  return crypto
    .createHmac("sha256", password)
    .update("hongsmu-session")
    .digest("hex");
}

export async function verifySession(): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session) return false;

  return session.value === generateToken(password);
}

export async function createSession(): Promise<void> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD not set");

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, generateToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
