import nodemailer from 'nodemailer';
import { IIdea } from '../models/Idea';

const resolveBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

const transporter = (() => {
  if (process.env.SMTP_URL) {
    return nodemailer.createTransport(process.env.SMTP_URL);
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = resolveBoolean(process.env.SMTP_SECURE, port === 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined
  });
})();

export const sendIdeaSubmittedEmail = async (idea: IIdea) => {
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@example.com';
  const toAddress = process.env.EMAIL_TO || process.env.SMTP_USER;

  if (!toAddress) {
    // No recipient configured; skip sending
    return;
  }

  const subject = `Ý tưởng mới: ${idea.ideaCode} ${idea.fullName ? `- ${idea.fullName}` : ''}`.trim();
  const submittedAt = idea.submissionDate ? new Date(idea.submissionDate) : new Date();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Ý tưởng mới được gửi</h2>
      <p><strong>Mã ý tưởng:</strong> ${idea.ideaCode}</p>
      ${idea.fullName ? `<p><strong>Họ và tên:</strong> ${idea.fullName}</p>` : ''}
      <p><strong>Phòng ban:</strong> ${idea.department}</p>
      ${idea.idea ? `<p><strong>Nội dung ý tưởng:</strong><br/>${escapeHtml(idea.idea)}</p>` : ''}
      <p><strong>Thời gian gửi:</strong> ${submittedAt.toLocaleString()}</p>
    </div>
  `;

  const text = `
Ý tưởng mới được gửi
- Mã ý tưởng: ${idea.ideaCode}
${idea.fullName ? `- Họ và tên: ${idea.fullName}\n` : ''}- Phòng ban: ${idea.department}
${idea.idea ? `- Nội dung ý tưởng: ${idea.idea}\n` : ''}- Thời gian gửi: ${submittedAt.toLocaleString()}
  `.trim();

  await transporter.sendMail({
    from: fromAddress,
    to: toAddress,
    subject,
    text,
    html
  });
};

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}; 