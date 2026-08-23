"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleCampaign = scheduleCampaign;
const prisma_1 = require("../db/prisma");
const emailQueue_1 = require("../queue/emailQueue");
const validation_1 = require("../utils/validation");
const parseRecipients_1 = require("../utils/parseRecipients");
async function scheduleCampaign(req, res) {
    let recipientsFromFile = [];
    if (req.file) {
        recipientsFromFile = (0, parseRecipients_1.parseRecipientsFile)(req.file.buffer, req.file.originalname);
    }
    const bodyRecipients = typeof req.body.recipients === "string" ? JSON.parse(req.body.recipients) : req.body.recipients;
    const parsed = validation_1.scheduleCampaignSchema.safeParse({
        ...req.body,
        recipients: recipientsFromFile.length > 0 ? recipientsFromFile : bodyRecipients,
    });
    if (!parsed.success) {
        return res.status(400).json({ error: "validation_error", details: parsed.error.flatten() });
    }
    const { subject, body, senderId, recipients, startTime, delayBetweenEmailsMs, hourlyLimit } = parsed.data;
    const sender = await prisma_1.prisma.sender.findUnique({ where: { id: senderId } });
    if (!sender) {
        return res.status(404).json({ error: "sender_not_found" });
    }
    const uniqueRecipients = Array.from(new Set(recipients.map((r) => r.toLowerCase())));
    const campaign = await prisma_1.prisma.campaign.create({
        data: { subject, body, startTime, delayBetweenEmailsMs, hourlyLimit },
    });
    const created = [];
    const skippedDuplicates = [];
    for (let i = 0; i < uniqueRecipients.length; i++) {
        const recipientEmail = uniqueRecipients[i];
        const scheduledFor = new Date(startTime.getTime() + i * delayBetweenEmailsMs);
        const idempotencyKey = `${campaign.id}:${recipientEmail}`;
        try {
            const emailJob = await prisma_1.prisma.emailJob.create({
                data: {
                    campaignId: campaign.id,
                    senderId,
                    recipientEmail,
                    subject,
                    body,
                    scheduledFor,
                    idempotencyKey,
                    status: "PENDING",
                },
            });
            const delayMs = Math.max(0, scheduledFor.getTime() - Date.now());
            const bullJob = await (0, emailQueue_1.enqueueEmailJob)({ emailJobId: emailJob.id, delayMs });
            await prisma_1.prisma.emailJob.update({
                where: { id: emailJob.id },
                data: { bullJobId: bullJob.id, status: "QUEUED" },
            });
            created.push({ recipient: recipientEmail, emailJobId: emailJob.id, scheduledFor });
        }
        catch (err) {
            if (err.code === "P2002") {
                skippedDuplicates.push(recipientEmail);
                continue;
            }
            throw err;
        }
    }
    return res.status(201).json({
        campaignId: campaign.id,
        scheduled: created.length,
        skippedDuplicates,
        firstScheduledFor: created[0]?.scheduledFor,
        lastScheduledFor: created[created.length - 1]?.scheduledFor,
    });
}
//# sourceMappingURL=scheduleController.js.map