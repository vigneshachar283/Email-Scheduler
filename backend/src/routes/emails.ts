import { Router } from "express";
import multer from "multer";
import { scheduleCampaign } from "../controllers/scheduleController";
import { listScheduledEmails, listSentEmails } from "../controllers/emailListController";
import { requireAuth } from "../middleware/auth";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const emailsRouter = Router();

emailsRouter.use(requireAuth);

// multipart/form-data with an optional "recipientsFile" field (CSV/txt),
// falling back to a JSON "recipients" array in the body if no file is sent.
emailsRouter.post("/schedule", upload.single("recipientsFile"), scheduleCampaign);
emailsRouter.get("/scheduled", listScheduledEmails);
emailsRouter.get("/sent", listSentEmails);
