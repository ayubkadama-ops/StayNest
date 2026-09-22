import { pool } from './db.js';

async function deliverEmail(to, subject, text) {
  if (!process.env.EMAIL_API_URL || !process.env.EMAIL_API_KEY) return false;
  const response = await fetch(process.env.EMAIL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text })
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return true;
}

async function deliverSms(to, text) {
  if (!process.env.SMS_API_URL || !process.env.SMS_API_KEY) return false;
  const response = await fetch(process.env.SMS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SMS_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: process.env.SMS_FROM, to, body: text })
  });
  if (!response.ok) throw new Error(`SMS provider returned ${response.status}`);
  return true;
}

export async function notifyUser(userId, { type, title, body, data = {} }) {
  const [users] = await pool.execute('SELECT email, phone FROM users WHERE id=? AND status="active"', [userId]);
  if (!users[0]) throw new Error('Notification recipient not found');
  await pool.execute('INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)', [userId, type, title, body, JSON.stringify(data)]);
  const [delivery] = await pool.execute('INSERT INTO notification_deliveries (user_id, type, status) VALUES (?, ?, "pending")', [userId, type]);
  try {
    const emailSent = users[0].email ? await deliverEmail(users[0].email, title, body) : false;
    const smsSent = users[0].phone ? await deliverSms(users[0].phone, body) : false;
    await pool.execute('UPDATE notification_deliveries SET status=?, delivered_at=UTC_TIMESTAMP(), metadata=? WHERE id=?', [emailSent || smsSent ? 'sent' : 'in_app', JSON.stringify({ emailSent, smsSent }), delivery.insertId]);
  } catch (error) {
    await pool.execute('UPDATE notification_deliveries SET status="failed", error_message=? WHERE id=?', [error.message.slice(0, 500), delivery.insertId]);
    // The in-app notification is already stored; provider outages must not erase it.
  }
}
