"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleCampaignSchema = exports.createSenderSchema = void 0;
const zod_1 = require("zod");
exports.createSenderSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    smtpHost: zod_1.z.string().min(1),
    smtpPort: zod_1.z.coerce.number().int().positive(),
    smtpUser: zod_1.z.string().min(1),
    smtpPass: zod_1.z.string().min(1),
    maxEmailsPerHour: zod_1.z.coerce.number().int().positive().default(200),
});
exports.scheduleCampaignSchema = zod_1.z.object({
    subject: zod_1.z.string().min(1),
    body: zod_1.z.string().min(1),
    senderId: zod_1.z.string().uuid(),
    recipients: zod_1.z.array(zod_1.z.string().email()).min(1),
    startTime: zod_1.z.coerce.date(),
    delayBetweenEmailsMs: zod_1.z.coerce.number().int().min(0).default(2000),
    hourlyLimit: zod_1.z.coerce.number().int().positive().default(200),
});
//# sourceMappingURL=validation.js.map