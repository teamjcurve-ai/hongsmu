import { WebClient } from "@slack/web-api";

let client: WebClient | null = null;

export function getSlackClient(): WebClient {
  if (!client) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) throw new Error("SLACK_BOT_TOKEN not set");
    client = new WebClient(token);
  }
  return client;
}

export async function sendMessage(channel: string, text: string, blocks?: unknown[]) {
  const slack = getSlackClient();
  return slack.chat.postMessage({
    channel,
    text,
    ...(blocks && { blocks }),
  });
}

export async function sendDM(userId: string, text: string, blocks?: unknown[]) {
  const slack = getSlackClient();
  const dm = await slack.conversations.open({ users: userId });
  if (!dm.channel?.id) throw new Error("Failed to open DM");
  return slack.chat.postMessage({
    channel: dm.channel.id,
    text,
    ...(blocks && { blocks }),
  });
}

export async function lookupUserByEmail(email: string): Promise<string | null> {
  try {
    const slack = getSlackClient();
    const res = await slack.users.lookupByEmail({ email });
    return res.user?.id || null;
  } catch {
    return null;
  }
}
