"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma_1 = require("./prisma");
/**
 * Creates one Ethereal test account and stores it as a Sender row, so you
 * can hit the Schedule API immediately without manually signing up for
 * Ethereal creds first. Run with: npm run seed
 */
async function main() {
    const testAccount = await nodemailer_1.default.createTestAccount();
    const sender = await prisma_1.prisma.sender.upsert({
        where: { email: testAccount.user },
        update: {},
        create: {
            name: "Demo Sender",
            email: testAccount.user,
            smtpHost: testAccount.smtp.host,
            smtpPort: testAccount.smtp.port,
            smtpUser: testAccount.user,
            smtpPass: testAccount.pass,
            maxEmailsPerHour: 200,
        },
    });
    console.log("✅ Seeded Ethereal sender:");
    console.log(`   id:    ${sender.id}`);
    console.log(`   email: ${sender.email}`);
    console.log(`   Sent mail previews at: https://ethereal.email/login`);
    console.log(`   (login with the email above and password: ${testAccount.pass})`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma_1.prisma.$disconnect());
//# sourceMappingURL=seed.js.map