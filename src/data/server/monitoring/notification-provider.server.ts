import "server-only";
import type { NotificationProvider, NotificationProviderResult } from "@/data/contracts/monitoring";

export interface EmailTransport {
  sendMessage(input: { to: string; subject: string; text: string; idempotencyKey: string }): Promise<{ accepted: boolean; delivered: boolean; messageId?: string }>;
}

/** Vendor-neutral mapping boundary; a company transport is injected during enterprise integration. */
export class EmailNotificationAdapter implements NotificationProvider {
  readonly channel = "EMAIL" as const;
  constructor(private readonly transport: EmailTransport) {}

  async send({ recipient, message, idempotencyKey }: Parameters<NotificationProvider["send"]>[0]): Promise<NotificationProviderResult> {
    const body = [
      `系统：${message.systemName}`, `严重程度：${message.severity}`, `故障：${message.title}`,
      `发生时间：${message.occurredAt}`, `模块：${message.component}`, `错误代码：${message.errorCode}`,
      `原因：${message.cause}`, `影响：${message.impact}`, `已采取措施：${message.actionTaken}`,
      `建议处理：${message.nextStep}`, `Incident ID：${message.incidentId}`, `详情：${message.detailUrl}`,
      `累计发生：${message.occurrenceCount} 次`,
    ].join("\n");
    const response = await this.transport.sendMessage({ to: recipient, subject: `[${message.severity}] ${message.title}`, text: body, idempotencyKey });
    if (!response.accepted) throw new Error("EMAIL_PROVIDER_DID_NOT_ACCEPT");
    return { confirmation: response.delivered ? "DELIVERED" : "ACCEPTED", providerMessageId: response.messageId ?? null };
  }
}

/** Explicit enterprise boundary. No SMTP credentials or vendor are assumed by this repository. */
export function createConfiguredEmailNotificationProvider(): NotificationProvider {
  throw new Error("EMAIL_NOTIFICATION_PROVIDER_NOT_CONFIGURED");
}
