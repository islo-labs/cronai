import type { JobResult } from "./runner.js";
import type { Credentials } from "./config.js";

export async function notifySlack(
  jobName: string,
  result: JobResult,
  credentials?: Credentials,
  channel?: string
): Promise<void> {
  const webhook = credentials?.slackWebhookUrl ?? process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;

  const status = result.success ? ":white_check_mark: Success" : ":x: Failed";
  const duration = (result.durationMs / 1000).toFixed(1);
  const cost = result.cost ? ` | $${result.cost.toFixed(4)}` : "";
  const output = result.output.slice(0, 500);

  const text = [
    `*${jobName}* — ${status}`,
    `Duration: ${duration}s${cost}`,
    output ? `\`\`\`${output}\`\`\`` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const payload: Record<string, string> = { text };
  if (channel) payload.channel = channel;

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error(`Slack notification failed: ${(err as Error).message}`);
  }
}
