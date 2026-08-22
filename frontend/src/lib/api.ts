import type {
  User,
  Sender,
  PaginatedEmails,
  ScheduleCampaignResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `Request failed (${res.status})`);
  }

  return res.json();
}

export const api = {
  mockLogin: (name: string, email: string) =>
    apiFetch<{ token: string; user: User }>("/auth/mock-login", {
      method: "POST",
      body: JSON.stringify({ name, email }),
    }),

  me: () => apiFetch<{ user: User }>("/auth/me"),

  listSenders: () => apiFetch<Sender[]>("/senders"),

  createSender: (data: Omit<Sender, "id" | "createdAt"> & { smtpPass: string }) =>
    apiFetch<Sender>("/senders", { method: "POST", body: JSON.stringify(data) }),

  scheduleCampaign: (formData: FormData) =>
    apiFetch<ScheduleCampaignResponse>("/emails/schedule", { method: "POST", body: formData }),

  scheduledEmails: (page = 1) => apiFetch<PaginatedEmails>(`/emails/scheduled?page=${page}`),

  sentEmails: (page = 1) => apiFetch<PaginatedEmails>(`/emails/sent?page=${page}`),
};
