"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRecipientsFile = parseRecipientsFile;
const EMAIL_REGEX = /[^\s,;<>()"']+@[^\s,;<>()"']+\.[^\s,;<>()"']+/g;
/**
 * Extracts email addresses from an uploaded CSV or .txt file.
 * Deliberately lenient about format — works whether the file is a single
 * column of emails, a full CSV with headers, or free-form text, by just
 * regex-matching anything email-shaped rather than assuming a schema.
 */
function parseRecipientsFile(buffer, filename) {
    const text = buffer.toString("utf-8");
    const matches = text.match(EMAIL_REGEX) ?? [];
    return Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));
}
//# sourceMappingURL=parseRecipients.js.map