import nodemailer, { Transporter } from 'nodemailer';

let transporterPromise: Promise<Transporter> | null = null;

async function getTransporter(): Promise<Transporter> {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log('✅ Created Ethereal SMTP test account:', testAccount.user);
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (err) {
      console.error('Failed to create Ethereal test account, using standard SMTP fallback:', err);
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'fallback@ethereal.email',
          pass: 'fallbackpass',
        },
      });
    }
  })();

  return transporterPromise;
}

export async function sendEmailViaEthereal(options: {
  from: string;
  to: string;
  subject: string;
  body: string;
}): Promise<{ messageId: string; previewUrl: string | false }> {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    text: options.body,
    html: `<p>${options.body.replace(/\n/g, '<br>')}</p>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`✉️ Email sent to ${options.to}! Preview URL: ${previewUrl}`);
  return {
    messageId: info.messageId,
    previewUrl,
  };
}
