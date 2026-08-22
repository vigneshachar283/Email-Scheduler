"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSender = createSender;
exports.listSenders = listSenders;
const prisma_1 = require("../db/prisma");
const validation_1 = require("../utils/validation");
async function createSender(req, res) {
    const parsed = validation_1.createSenderSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "validation_error", details: parsed.error.flatten() });
    }
    const sender = await prisma_1.prisma.sender.create({ data: parsed.data });
    // Never echo back the SMTP password.
    const { smtpPass, ...safe } = sender;
    return res.status(201).json(safe);
}
async function listSenders(_req, res) {
    const senders = await prisma_1.prisma.sender.findMany({ orderBy: { createdAt: "desc" } });
    return res.json(senders.map(({ smtpPass, ...s }) => s));
}
//# sourceMappingURL=senderController.js.map