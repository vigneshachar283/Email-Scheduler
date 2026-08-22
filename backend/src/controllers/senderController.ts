import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { createSenderSchema } from "../utils/validation";

export async function createSender(req: Request, res: Response) {
  const parsed = createSenderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", details: parsed.error.flatten() });
  }

  const sender = await prisma.sender.create({ data: parsed.data });
  // Never echo back the SMTP password.
  const { smtpPass, ...safe } = sender;
  return res.status(201).json(safe);
}

export async function listSenders(_req: Request, res: Response) {
  const senders = await prisma.sender.findMany({ orderBy: { createdAt: "desc" } });
  return res.json(senders.map(({ smtpPass, ...s }) => s));
}
