"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listScheduledEmails = listScheduledEmails;
exports.listSentEmails = listSentEmails;
const prisma_1 = require("../db/prisma");
async function listScheduledEmails(req, res) {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 50);
    const [items, total] = await Promise.all([
        prisma_1.prisma.emailJob.findMany({
            where: { status: { in: ["PENDING", "QUEUED", "RESCHEDULED"] } },
            orderBy: { scheduledFor: "asc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: { sender: { select: { name: true, email: true } } },
        }),
        prisma_1.prisma.emailJob.count({ where: { status: { in: ["PENDING", "QUEUED", "RESCHEDULED"] } } }),
    ]);
    return res.json({ items, total, page, pageSize });
}
async function listSentEmails(req, res) {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 50);
    const [items, total] = await Promise.all([
        prisma_1.prisma.emailJob.findMany({
            where: { status: { in: ["SENT", "FAILED"] } },
            orderBy: { updatedAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: { sender: { select: { name: true, email: true } } },
        }),
        prisma_1.prisma.emailJob.count({ where: { status: { in: ["SENT", "FAILED"] } } }),
    ]);
    return res.json({ items, total, page, pageSize });
}
