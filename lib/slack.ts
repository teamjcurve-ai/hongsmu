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

export async function sendMessage(
  channel: string,
  text: string,
  options?: { thread_ts?: string; blocks?: unknown[] }
) {
  const slack = getSlackClient();
  return slack.chat.postMessage({
    channel,
    text,
    ...(options?.thread_ts && { thread_ts: options.thread_ts }),
    ...(options?.blocks && { blocks: options.blocks }),
  });
}

export async function sendDM(
  userId: string,
  text: string,
  blocks?: unknown[]
) {
  const slack = getSlackClient();
  const dm = await slack.conversations.open({ users: userId });
  if (!dm.channel?.id) throw new Error("Failed to open DM");
  return slack.chat.postMessage({
    channel: dm.channel.id,
    text,
    ...(blocks && { blocks }),
  });
}

export async function lookupUserByEmail(
  email: string
): Promise<string | null> {
  try {
    const slack = getSlackClient();
    const res = await slack.users.lookupByEmail({ email });
    return res.user?.id || null;
  } catch {
    return null;
  }
}

// 스레드의 모든 메시지 가져오기
export async function getThreadMessages(
  channel: string,
  threadTs: string
): Promise<Array<{ user: string; text: string; ts: string }>> {
  const slack = getSlackClient();
  const res = await slack.conversations.replies({
    channel,
    ts: threadTs,
    limit: 100,
  });

  return (
    res.messages?.map((m) => ({
      user: m.user || "",
      text: m.text || "",
      ts: m.ts || "",
    })) || []
  );
}

// 슬랙 메시지 permalink 가져오기
export async function getPermalink(
  channel: string,
  messageTs: string
): Promise<string | null> {
  try {
    const slack = getSlackClient();
    const res = await slack.chat.getPermalink({
      channel,
      message_ts: messageTs,
    });
    return res.permalink || null;
  } catch {
    return null;
  }
}

// 슬랙 유저 ID → 이름 변환
export async function getUserName(userId: string): Promise<string> {
  try {
    const slack = getSlackClient();
    const res = await slack.users.info({ user: userId });
    return (
      res.user?.real_name || res.user?.name || userId
    );
  } catch {
    return userId;
  }
}
