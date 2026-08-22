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
const mockAuth_1 = require("../middleware/mockAuth");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
exports.emailsRouter = (0, express_1.Router)();
exports.emailsRouter.use(mockAuth_1.requireAuth);
// multipart/form-data with an optional "recipientsFile" field (CSV/txt),
// falling back to a JSON "recipients" array in the body if no file is sent.
exports.emailsRouter.post("/schedule", upload.single("recipientsFile"), scheduleController_1.scheduleCampaign);
exports.emailsRouter.get("/scheduled", emailListController_1.listScheduledEmails);
exports.emailsRouter.get("/sent", emailListController_1.listSentEmails);
//# sourceMappingURL=emails.js.map