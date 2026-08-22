import { Request, Response } from "express";
import { prisma } from "../db/prisma";

export async function listScheduledEmails(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 50);

  const [items, total] = await Promise.all([
    prisma.emailJob.findMany({
      where: { status: { in: ["PENDING", "QUEUED", "RESCHEDULED"] } },
      orderBy: { scheduledFor: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { sender: { select: { name: true, email: true } } },
    }),
    prisma.emailJob.count({ where: { status: { in: ["PENDING", "QUEUED", "RESCHEDULED"] } } }),
  ]);

  return res.json({ items, total, page, pageSize });
}

export async function listSentEmails(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 50);

  const [items, total] = await Promise.all([
    prisma.emailJob.findMany({
      where: { status: { in: ["SENT", "FAILED"] } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { sender: { select: { name: true, email: true } } },
    }),
    prisma.emailJob.count({ where: { status: { in: ["SENT", "FAILED"] } } }),
  ]);

  return res.json({ items, total, page, pageSize });
}
