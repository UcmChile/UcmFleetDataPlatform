import mysql from 'mysql2/promise'

/**
 * Cliente de lectura Traumasoft (mysql2).
 * Requiere TS_PASSWORD en .env (mismas variables que ProyectoVehiculosTS).
 */
export async function connectTraumasoft() {
  const password = process.env.TS_PASSWORD
  if (!password) {
    throw new Error('Falta TS_PASSWORD para conectar a Traumasoft')
  }

  const conn = await mysql.createConnection({
    host: process.env.TS_HOST || 'remotereporting.traumasoft.com',
    port: Number(process.env.TS_PORT || 6033),
    user: process.env.TS_USER || 'ucm_ro',
    password,
    database: process.env.TS_DB || 'traumasoft_ucm',
    connectTimeout: 60000,
  })

  return {
    async query(sqlText) {
      const [rows] = await conn.query(sqlText)
      return rows
    },
    async close() {
      await conn.end()
    },
  }
}
