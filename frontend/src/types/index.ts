export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

export interface Sender {
  id: string;
  name: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  maxEmailsPerHour: number;
  createdAt: string;
}

export type EmailStatus = "PENDING" | "QUEUED" | "SENT" | "FAILED" | "RESCHEDULED";

export interface EmailJobRow {
  id: string;
  recipientEmail: string;
  subject: string;
  scheduledFor: string;
  sentAt: string | null;
  status: EmailStatus;
  lastError: string | null;
  sender: { name: string; email: string };
}

export interface PaginatedEmails {
  items: EmailJobRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ScheduleCampaignResponse {
  campaignId: string;
  scheduled: number;
  skippedDuplicates: string[];
  firstScheduledFor?: string;
  lastScheduledFor?: string;
}
