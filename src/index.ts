import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { pool } from './db/postgres.js'
import { redis } from './redis/redis.js'

const app = new Hono()

app.get('/', async (c) => {
  console.log('Server is up and running')
  return c.text('Hono + Postgres + Redis 🚀')
})

app.post('/users', async (c) => {
  const { name, email, password } = await c.req.json()

  const result = await pool.query(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
    [name, email, password]
  )

  const user = result.rows[0]

  return c.json({
    source: 'postgres',
    data: user,
  })
})

app.patch('/users/:id', async (c) => {
  const id = c.req.param('id')
  const { name, email, password } = await c.req.json()

  const result = await pool.query(
    'UPDATE users SET name = $1, email = $2, password = $3 WHERE id = $4 RETURNING *',
    [name, email, password, id]
  )

  const user = result.rows[0]

  await redis.del(`user:${id}`)

  return c.json({
    source: 'postgres',
    data: user,
  })
})

app.get('/users', async (c) => {
  const result = await pool.query('SELECT * FROM users')

  const users = result.rows

  return c.json({
    source: 'postgres',
    data: users,
  })
})

app.get('/users/:id', async (c) => {
  const id = c.req.param('id')

  // 1. Check cache
  const cached = await redis.get(`user:${id}`)

  if (cached) {
    return c.json({
      source: 'redis',
      data: JSON.parse(cached),
    })
  }
  console.log('Suprise mf')
  // 2. Query DB
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  )

  const user = result.rows[0]

  // 3. Store in cache
  await redis.set(
    `user:${id}`,
    JSON.stringify(user),
    'EX',
    60
  )

  return c.json({
    source: 'postgres',
    data: user,
  })
})
const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})