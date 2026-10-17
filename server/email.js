const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character]);

function publicAppUrl() {
  return String(process.env.PUBLIC_APP_URL || process.env.APP_ORIGIN || 'https://staynest-np7j.onrender.com').replace(/\/$/, '');
}

export function renderBrandedEmail({ title, text, actionUrl, actionLabel }) {
  const appUrl = publicAppUrl();
  const paragraphs = String(text || '').split(/\r?\n/).filter(Boolean)
    .map(line => `<p style="margin:0 0 16px;color:#344a43;font-size:15px;line-height:1.6">${escapeHtml(line)}</p>`)
    .join('');
  const action = actionUrl
    ? `<p style="margin:24px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:12px 18px;background:#087f5b;border-radius:6px;color:#fff;font-weight:700;text-decoration:none">${escapeHtml(actionLabel || 'Continue to Makazi Go')}</a></p><p style="color:#68776f;font-size:12px;line-height:1.5">If the button does not open, use this link:<br><a href="${escapeHtml(actionUrl)}" style="color:#087f5b;overflow-wrap:anywhere">${escapeHtml(actionUrl)}</a></p>`
    : '';
  return `<!doctype html><html lang="en"><body style="margin:0;padding:24px;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #dfe8e3;border-radius:8px"><tr><td style="padding:28px 32px"><p style="margin:0 0 24px"><img src="${escapeHtml(`${appUrl}/assets/makazi-go-icon.png`)}" width="44" height="44" alt="Makazi Go" style="display:block;object-fit:contain"></p><h1 style="margin:0 0 20px;color:#062b22;font-size:24px;line-height:1.25">${escapeHtml(title)}</h1>${paragraphs}${action}<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e6ece8;color:#68776f;font-size:12px">Makazi Go · Find your place. Make your move.</p></td></tr></table></td></tr></table></body></html>`;
}

export async function sendBrandedEmail({ to, subject, text, actionUrl, actionLabel }) {
  if (!to) return false;
  const from = process.env.RESEND_FROM || process.env.EMAIL_FROM;
  const html = renderBrandedEmail({ title: subject, text, actionUrl, actionLabel });

  if (process.env.RESEND_API_KEY) {
    if (!from) throw new Error('RESEND_FROM is required when Resend is enabled');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from, to: [to], subject, text, html })
    });
    if (!response.ok) throw new Error(`Resend email delivery failed (${response.status})`);
    return true;
  }

  if (process.env.EMAIL_API_URL && process.env.EMAIL_API_KEY) {
    if (!from) throw new Error('EMAIL_FROM is required when the email API is enabled');
    const response = await fetch(process.env.EMAIL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from, to, subject, text, html })
    });
    if (!response.ok) throw new Error(`Email provider delivery failed (${response.status})`);
    return true;
  }

  return false;
}
