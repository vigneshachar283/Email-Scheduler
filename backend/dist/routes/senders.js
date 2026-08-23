"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.senderRouter = void 0;
const express_1 = require("express");
const senderController_1 = require("../controllers/senderController");
const auth_1 = require("../middleware/auth");
exports.senderRouter = (0, express_1.Router)();
exports.senderRouter.use(auth_1.requireAuth);
exports.senderRouter.post("/", senderController_1.createSender);
exports.senderRouter.get("/", senderController_1.listSenders);
//# sourceMappingURL=senders.js.map