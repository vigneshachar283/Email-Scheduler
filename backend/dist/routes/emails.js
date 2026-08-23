"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailsRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const scheduleController_1 = require("../controllers/scheduleController");
const emailListController_1 = require("../controllers/emailListController");
const auth_1 = require("../middleware/auth");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
exports.emailsRouter = (0, express_1.Router)();
exports.emailsRouter.use(auth_1.requireAuth);

exports.emailsRouter.post("/schedule", upload.single("recipientsFile"), scheduleController_1.scheduleCampaign);
exports.emailsRouter.get("/scheduled", emailListController_1.listScheduledEmails);
exports.emailsRouter.get("/sent", emailListController_1.listSentEmails);
