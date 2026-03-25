import crypto from "crypto";

export function verifySlackRequest(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  // 5분 이상 지난 요청 거부
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 60 * 5) return false;

  const basestring = `v0:${timestamp}:${body}`;
  const computed =
    "v0=" +
    crypto
      .createHmac("sha256", signingSecret)
      .update(basestring)
      .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature)
  );
}
