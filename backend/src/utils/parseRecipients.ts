const EMAIL_REGEX = /[^\s,;<>()"']+@[^\s,;<>()"']+\.[^\s,;<>()"']+/g;


export function parseRecipientsFile(buffer: Buffer, filename: string): string[] {
  const text = buffer.toString("utf-8");
  const matches = text.match(EMAIL_REGEX) ?? [];
  return Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));
}
