import { Router } from "express";
import { createSender, listSenders } from "../controllers/senderController";
import { requireAuth } from "../middleware/mockAuth";

export const senderRouter = Router();

senderRouter.use(requireAuth);
senderRouter.post("/", createSender);
senderRouter.get("/", listSenders);
