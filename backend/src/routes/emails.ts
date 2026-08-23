import { Router } from "express";
import multer from "multer";
import { scheduleCampaign } from "../controllers/scheduleController";
import { listScheduledEmails, listSentEmails } from "../controllers/emailListController";
import { requireAuth } from "../middleware/auth";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const emailsRouter = Router();

emailsRouter.use(requireAuth);


emailsRouter.post("/schedule", upload.single("recipientsFile"), scheduleCampaign);
emailsRouter.get("/scheduled", listScheduledEmails);
emailsRouter.get("/sent", listSentEmails);
