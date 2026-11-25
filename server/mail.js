// Email delivery for password reset.
// Works only when RESEND_API_KEY and MAIL_FROM are set (https://resend.com).
// Without them the site says honestly that email is not configured.

export const mailEnabled = Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

const subjects = {
  ru: 'Ailim: восстановление доступа',
  en: 'Ailim: reset your password',
  kk: 'Ailim: қолжетімділікті қалпына келтіру',
};
const bodies = {
  ru: (link) => `Здравствуйте!\n\nЧтобы задать новый пароль, откройте ссылку (действует 1 час):\n${link}\n\nЕсли вы не запрашивали сброс, просто проигнорируйте это письмо.`,
  en: (link) => `Hello!\n\nTo set a new password, open this link (valid for 1 hour):\n${link}\n\nIf you didn't request a reset, you can ignore this email.`,
  kk: (link) => `Сәлеметсіз бе!\n\nЖаңа құпиясөз орнату үшін сілтемені ашыңыз (1 сағат жарамды):\n${link}\n\nЕгер сіз сұрамасаңыз, бұл хатты елемеңіз.`,
};

export async function sendResetEmail(to, link, lang = 'ru') {
  if (!mailEnabled) {
    if (process.env.NODE_ENV !== 'production') console.log(`[dev] Password reset link for ${to}: ${link}`);
    return false;
  }
  const l = subjects[lang] ? lang : 'en';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject: subjects[l], text: bodies[l](link) }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
  return true;
}
