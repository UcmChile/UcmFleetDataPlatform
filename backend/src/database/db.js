import sql from 'mssql'
import { env } from '../config/env.js'

let poolPromise

export { sql }

export function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(env.database)
  }
  return poolPromise
}

export async function closePool() {
  if (!poolPromise) return
  const pool = await poolPromise
  await pool.close()
  poolPromise = undefined
}

export async function query(statement, params = {}) {
  const pool = await getPool()
  const request = pool.request()

  Object.entries(params).forEach(([key, value]) => {
    if (value && typeof value === 'object' && 'type' in value && 'value' in value) {
      request.input(key, value.type, value.value)
      return
    }
    request.input(key, value ?? null)
  })

  return request.query(statement)
}

export async function withTransaction(work) {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  await transaction.begin()
  try {
    const result = await work(transaction)
    await transaction.commit()
    return result
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export function txRequest(transaction, params = {}) {
  const request = new sql.Request(transaction)
  Object.entries(params).forEach(([key, value]) => {
    if (value && typeof value === 'object' && 'type' in value && 'value' in value) {
      request.input(key, value.type, value.value)
      return
    }
    request.input(key, value ?? null)
  })
  return request
}
