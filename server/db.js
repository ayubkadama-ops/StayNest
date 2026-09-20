import mysql from 'mysql2/promise';

const databaseHost = process.env.MYSQL_HOST || '';
const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(databaseHost.toLowerCase());
const useDatabaseTls = process.env.MYSQL_SSL === 'true' || (!isLocalDatabase && process.env.MYSQL_SSL !== 'false');

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z',
  decimalNumbers: true,
  ...(useDatabaseTls ? { ssl: { minVersion: 'TLSv1.2' } } : {})
});

export async function assertDatabaseConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}
