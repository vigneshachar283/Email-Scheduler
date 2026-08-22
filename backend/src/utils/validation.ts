import { z } from "zod";

export const createSenderSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().int().positive(),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  maxEmailsPerHour: z.coerce.number().int().positive().default(200),
});

export const scheduleCampaignSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  senderId: z.string().uuid(),
  recipients: z.array(z.string().email()).min(1),
  startTime: z.coerce.date(),
  delayBetweenEmailsMs: z.coerce.number().int().min(0).default(2000),
  hourlyLimit: z.coerce.number().int().positive().default(200),
});

export type ScheduleCampaignInput = z.infer<typeof scheduleCampaignSchema>;
export type CreateSenderInput = z.infer<typeof createSenderSchema>;
