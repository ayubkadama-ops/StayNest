import session from 'express-session';
import { pool } from './db.js';

export class MySqlSessionStore extends session.Store {
  async get(sid, callback) {
    try {
      const [rows] = await pool.execute('SELECT data FROM web_sessions WHERE sid=? AND expires_at > UTC_TIMESTAMP()', [sid]);
      callback(null, rows[0] ? JSON.parse(rows[0].data) : null);
    } catch (error) { callback(error); }
  }

  async set(sid, sessionData, callback) {
    try {
      const expires = new Date(sessionData.cookie.expires || Date.now() + 28800000);
      await pool.execute(
        'INSERT INTO web_sessions (sid, expires_at, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at), data=VALUES(data)',
        [sid, expires, JSON.stringify(sessionData)]
      );
      callback?.(null);
    } catch (error) { callback?.(error); }
  }

  async destroy(sid, callback) {
    try { await pool.execute('DELETE FROM web_sessions WHERE sid=?', [sid]); callback?.(null); }
    catch (error) { callback?.(error); }
  }

  async destroyUserSessions(userId) {
    const [rows] = await pool.execute('SELECT sid, data FROM web_sessions');
    const sessionIds = rows.filter(row => {
      try {
        return Number(JSON.parse(row.data)?.user?.id) === Number(userId);
      } catch {
        return false;
      }
    }).map(row => row.sid);
    if (sessionIds.length) {
      await pool.query('DELETE FROM web_sessions WHERE sid IN (?)', [sessionIds]);
    }
    return sessionIds.length;
  }

  async touch(sid, sessionData, callback) {
    try {
      const expires = new Date(sessionData.cookie.expires || Date.now() + 28800000);
      await pool.execute('UPDATE web_sessions SET expires_at=? WHERE sid=?', [expires, sid]);
      callback?.(null);
    } catch (error) { callback?.(error); }
  }
}

export async function ensureSessionTable() {
  await pool.execute(`CREATE TABLE IF NOT EXISTS web_sessions (
    sid VARCHAR(128) PRIMARY KEY,
    expires_at DATETIME NOT NULL,
    data MEDIUMTEXT NOT NULL,
    INDEX idx_web_sessions_expiry (expires_at)
  ) ENGINE=InnoDB`);
}
