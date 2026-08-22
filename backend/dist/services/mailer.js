"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransporter = getTransporter;
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Ethereal creds differ per sender, so we cache one transporter per sender
// instead of rebuilding a connection on every single send.
const transporterCache = new Map();
function getTransporter(sender) {
    const cached = transporterCache.get(sender.id);
    if (cached)
        return cached;
    const transporter = nodemailer_1.default.createTransport({
        host: sender.smtpHost,
        port: sender.smtpPort,
        secure: false, // Ethereal uses STARTTLS on 587
        auth: {
            user: sender.smtpUser,
            pass: sender.smtpPass,
        },
    });
    transporterCache.set(sender.id, transporter);
    return transporter;
}
async function sendEmail(params) {
    const transporter = getTransporter(params.sender);
    const info = await transporter.sendMail({
        from: `"${params.sender.name}" <${params.sender.email}>`,
        to: params.to,
        subject: params.subject,
        text: params.body,
        html: `<p>${params.body.replace(/\n/g, "<br/>")}</p>`,
    });
    // Ethereal gives us a preview URL — very handy for the demo video.
    const previewUrl = nodemailer_1.default.getTestMessageUrl(info) || undefined;
    return { messageId: info.messageId, previewUrl };
}
//# sourceMappingURL=mailer.js.map