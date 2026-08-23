"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRecipientsFile = parseRecipientsFile;
const EMAIL_REGEX = /[^\s,;<>()"']+@[^\s,;<>()"']+\.[^\s,;<>()"']+/g;

function parseRecipientsFile(buffer, filename) {
    const text = buffer.toString("utf-8");
    const matches = text.match(EMAIL_REGEX) ?? [];
    return Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));
}
