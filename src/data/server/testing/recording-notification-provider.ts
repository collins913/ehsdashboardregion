import type { NotificationProvider, NotificationMessage, NotificationProviderResult } from "@/data/contracts/monitoring";

export class RecordingNotificationProvider implements NotificationProvider {
  readonly channel = "EMAIL" as const;
  readonly sent = new Map<string, { recipient: string; message: NotificationMessage }>();
  constructor(private readonly confirmation: NotificationProviderResult["confirmation"] = "ACCEPTED") {}

  async send(input: { recipient: string; message: NotificationMessage; idempotencyKey: string }): Promise<NotificationProviderResult> {
    if (!this.sent.has(input.idempotencyKey)) this.sent.set(input.idempotencyKey, { recipient: input.recipient, message: input.message });
    return { confirmation: this.confirmation, providerMessageId: `test:${this.sent.size}` };
  }
}
