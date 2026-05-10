import { Pool } from 'pg'

export const pool = new Pool({
    user: 'admin',
    host: 'localhost',
    database: 'mydb',
    password: 'password',
    port: 5432,
})