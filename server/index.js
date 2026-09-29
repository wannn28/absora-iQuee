import crypto from 'crypto'
import path from 'path'
import express from 'express'
import cookieParser from 'cookie-parser'
import { fileURLToPath } from 'url'
import { APP_TODAY, DEFAULT_TASKS, PALETTE, openDb } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = openDb()
const app = express()
const PORT = Number(process.env.PORT || 3016)

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':')
  if (!salt || !hash) return false
  const next = crypto.scryptSync(password, salt, 32)
  const prev = Buffer.from(hash, 'hex')
  if (next.length !== prev.length) return false
  return crypto.timingSafeEqual(next, prev)
}

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role }
}

function setSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires)
  const secure = req.headers['x-forwarded-proto'] === 'https'
  res.cookie('absora_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

function currentUser(req) {
  const token = req.cookies.absora_session
  if (!token) return null
  return db.prepare(`
    SELECT u.id, u.name, u.email, u.role
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, Date.now()) || null
}

function requireAuth(req, res, next) {
  const user = currentUser(req)
  if (!user) return res.status(401).json({ error: 'Please sign in.' })
  req.user = user
  next()
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const TYPES = ['Paid Leave', 'Sick Leave', 'Vacation']
const STATUSES = ['Approved', 'Pending']

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, today: APP_TODAY })
})

app.post('/api/auth/register', (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (name.length < 2) return res.status(400).json({ error: 'Name is required.' })
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email.' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (exists) return res.status(409).json({ error: 'An account with that email already exists.' })
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c
  const role = count === 0 ? 'admin' : 'member'
  const info = db.prepare(
    'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(name, email, hashPassword(password), role, new Date().toISOString())
  setSession(req, res, info.lastInsertRowid)
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json({ user })
})

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'Email or password is incorrect.' })
  }
  setSession(req, res, row.id)
  res.json({ user: publicUser(row) })
})

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies.absora_session
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  res.clearCookie('absora_session', { path: '/' })
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  const user = currentUser(req)
  if (!user) return res.status(401).json({ error: 'Please sign in.' })
  res.json({ user, today: APP_TODAY })
})

app.patch('/api/auth/settings', requireAuth, (req, res) => {
  const name = String(req.body?.name || '').trim()
  const currentPassword = String(req.body?.currentPassword || '')
  const newPassword = String(req.body?.newPassword || '')
  if (name.length < 2) return res.status(400).json({ error: 'Name is required.' })
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (newPassword) {
    if (!verifyPassword(currentPassword, row.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect.' })
    }
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' })
    db.prepare('UPDATE users SET name = ?, password_hash = ? WHERE id = ?').run(name, hashPassword(newPassword), req.user.id)
  } else {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id)
  }
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.user.id)
  res.json({ user })
})

app.get('/api/employees', requireAuth, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  let rows = db.prepare('SELECT * FROM employees ORDER BY id').all()
  if (q) {
    rows = rows.filter((e) =>
      [e.name, e.email, e.role_title, e.department].join(' ').toLowerCase().includes(q)
    )
  }
  res.json({ employees: rows })
})

app.post('/api/employees', requireAuth, (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase()
  const role_title = String(req.body?.role_title || req.body?.role || '').trim()
  const department = String(req.body?.department || 'General').trim() || 'General'
  if (name.length < 2) return res.status(400).json({ error: 'Name is required.' })
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email.' })
  if (!role_title) return res.status(400).json({ error: 'Role is required.' })
  const count = db.prepare('SELECT COUNT(*) AS c FROM employees').get().c
  const color = PALETTE[count % PALETTE.length]
  const info = db.prepare(
    'INSERT INTO employees (name, email, role_title, department, color, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, email, role_title, department, color, new Date().toISOString())
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json({ employee })
})

app.get('/api/employees/:id', requireAuth, (req, res) => {
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id)
  if (!employee) return res.status(404).json({ error: 'Employee not found.' })
  const absences = db.prepare('SELECT * FROM absences WHERE employee_id = ? ORDER BY start_date').all(employee.id)
  res.json({ employee, absences })
})

app.patch('/api/employees/:id', requireAuth, (req, res) => {
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id)
  if (!employee) return res.status(404).json({ error: 'Employee not found.' })
  const name = String(req.body?.name ?? employee.name).trim()
  const email = String(req.body?.email ?? employee.email).trim().toLowerCase()
  const role_title = String(req.body?.role_title ?? req.body?.role ?? employee.role_title).trim()
  const department = String(req.body?.department ?? employee.department).trim() || 'General'
  if (name.length < 2 || !validEmail(email) || !role_title) {
    return res.status(400).json({ error: 'Name, email, and role are required.' })
  }
  db.prepare('UPDATE employees SET name = ?, email = ?, role_title = ?, department = ? WHERE id = ?')
    .run(name, email, role_title, department, employee.id)
  res.json({ employee: db.prepare('SELECT * FROM employees WHERE id = ?').get(employee.id) })
})

app.get('/api/absences', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, e.name AS employee_name, e.role_title, e.color
    FROM absences a JOIN employees e ON e.id = a.employee_id
    ORDER BY a.start_date, e.name
  `).all()
  res.json({ absences: rows })
})

app.post('/api/absences', requireAuth, (req, res) => {
  const employee_id = Number(req.body?.employee_id)
  const type = String(req.body?.type || '')
  const status = String(req.body?.status || 'Pending')
  const start_date = String(req.body?.start_date || '')
  const end_date = String(req.body?.end_date || '')
  const note = String(req.body?.note || '').slice(0, 300)
  if (!db.prepare('SELECT id FROM employees WHERE id = ?').get(employee_id)) {
    return res.status(400).json({ error: 'Choose an employee.' })
  }
  if (!TYPES.includes(type)) return res.status(400).json({ error: 'Choose a leave type.' })
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date) || start_date > end_date) {
    return res.status(400).json({ error: 'Enter a valid date range.' })
  }
  const info = db.prepare(
    'INSERT INTO absences (employee_id, type, status, start_date, end_date, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(employee_id, type, status, start_date, end_date, note)
  const absence = db.prepare(`
    SELECT a.*, e.name AS employee_name, e.role_title, e.color
    FROM absences a JOIN employees e ON e.id = a.employee_id WHERE a.id = ?
  `).get(info.lastInsertRowid)
  res.status(201).json({ absence })
})

app.patch('/api/absences/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM absences WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Absence not found.' })
  const type = String(req.body?.type ?? row.type)
  const status = String(req.body?.status ?? row.status)
  const start_date = String(req.body?.start_date ?? row.start_date)
  const end_date = String(req.body?.end_date ?? row.end_date)
  const note = String(req.body?.note ?? row.note).slice(0, 300)
  if (!TYPES.includes(type) || !STATUSES.includes(status) || start_date > end_date) {
    return res.status(400).json({ error: 'Invalid absence.' })
  }
  db.prepare('UPDATE absences SET type = ?, status = ?, start_date = ?, end_date = ?, note = ? WHERE id = ?')
    .run(type, status, start_date, end_date, note, row.id)
  const absence = db.prepare(`
    SELECT a.*, e.name AS employee_name, e.role_title, e.color
    FROM absences a JOIN employees e ON e.id = a.employee_id WHERE a.id = ?
  `).get(row.id)
  res.json({ absence })
})

app.delete('/api/absences/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM absences WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

app.get('/api/events', requireAuth, (_req, res) => {
  res.json({ events: db.prepare('SELECT * FROM events ORDER BY event_date, start_time').all() })
})

app.post('/api/events', requireAuth, (req, res) => {
  const title = String(req.body?.title || '').trim()
  const subtitle = String(req.body?.subtitle || '').trim()
  const event_date = String(req.body?.event_date || '')
  const start_time = String(req.body?.start_time || '')
  const end_time = String(req.body?.end_time || '')
  const badge = String(req.body?.badge || '').slice(0, 40)
  const highlighted = req.body?.highlighted ? 1 : 0
  if (title.length < 2) return res.status(400).json({ error: 'Title is required.' })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) return res.status(400).json({ error: 'Date is required.' })
  if (!/^\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}$/.test(end_time)) {
    return res.status(400).json({ error: 'Start and end times are required.' })
  }
  const info = db.prepare(
    'INSERT INTO events (title, subtitle, event_date, start_time, end_time, badge, highlighted) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(title, subtitle, event_date, start_time, end_time, badge, highlighted)
  res.status(201).json({ event: db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid) })
})

app.delete('/api/events/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

function onboardingList() {
  const people = db.prepare('SELECT * FROM onboarding_people ORDER BY id').all()
  const tasks = db.prepare('SELECT * FROM onboarding_tasks ORDER BY sort_order, id').all()
  return people.map((p) => {
    const mine = tasks.filter((t) => t.person_id === p.id)
    return {
      ...p,
      done: mine.filter((t) => t.done).length,
      total: mine.length,
      tasks: mine,
    }
  })
}

app.get('/api/onboarding', requireAuth, (_req, res) => {
  res.json({ people: onboardingList() })
})

app.post('/api/onboarding', requireAuth, (req, res) => {
  const name = String(req.body?.name || '').trim()
  const role_title = String(req.body?.role_title || req.body?.role || '').trim()
  if (name.length < 2 || !role_title) return res.status(400).json({ error: 'Name and role are required.' })
  const count = db.prepare('SELECT COUNT(*) AS c FROM onboarding_people').get().c
  const info = db.prepare('INSERT INTO onboarding_people (name, role_title, color) VALUES (?, ?, ?)')
    .run(name, role_title, PALETTE[count % PALETTE.length])
  const task = db.prepare('INSERT INTO onboarding_tasks (person_id, title, done, sort_order) VALUES (?, ?, 0, ?)')
  DEFAULT_TASKS.forEach((title, i) => task.run(info.lastInsertRowid, title, i))
  res.status(201).json({ people: onboardingList() })
})

app.patch('/api/onboarding/tasks/:id', requireAuth, (req, res) => {
  const task = db.prepare('SELECT * FROM onboarding_tasks WHERE id = ?').get(req.params.id)
  if (!task) return res.status(404).json({ error: 'Task not found.' })
  const done = req.body?.done ? 1 : 0
  db.prepare('UPDATE onboarding_tasks SET done = ? WHERE id = ?').run(done, task.id)
  res.json({ people: onboardingList() })
})

app.get('/api/dashboard', requireAuth, (req, res) => {
  const from = String(req.query.from || '2025-12-01')
  const to = String(req.query.to || '2025-12-31')
  const employees = db.prepare('SELECT * FROM employees ORDER BY id').all()
  const absences = db.prepare(`
    SELECT * FROM absences WHERE end_date >= ? AND start_date <= ?
  `).all(from, to)
  const events = db.prepare('SELECT * FROM events ORDER BY highlighted DESC, event_date, start_time').all()
  const onboarding = onboardingList().map(({ tasks, ...rest }) => rest)
  res.json({ today: APP_TODAY, employees, absences, events, onboarding })
})

app.get('/api/reports', requireAuth, (_req, res) => {
  const month = APP_TODAY.slice(0, 7)
  const from = `${month}-01`
  const to = `${month}-31`
  const headcount = db.prepare('SELECT COUNT(*) AS c FROM employees').get().c
  const monthAbsences = db.prepare('SELECT * FROM absences WHERE end_date >= ? AND start_date <= ?').all(from, to)
  const pendingItems = db.prepare(`
    SELECT a.*, e.name AS employee_name, e.role_title, e.color
    FROM absences a JOIN employees e ON e.id = a.employee_id
    WHERE a.status = 'Pending' ORDER BY a.start_date
  `).all()
  const byType = TYPES.map((type) => ({
    type,
    count: monthAbsences.filter((a) => a.type === type).length,
  }))
  res.json({
    headcount,
    month,
    absencesThisMonth: monthAbsences.length,
    pending: pendingItems.length,
    byType,
    pendingItems,
  })
})

function fmtRange(a) {
  return `${a.start_date} to ${a.end_date}`
}

app.post('/api/assistant', requireAuth, (req, res) => {
  const message = String(req.body?.message || '').trim().slice(0, 300)
  if (!message) return res.status(400).json({ error: 'Ask something first.' })
  const q = message.toLowerCase()
  const today = APP_TODAY
  const employees = db.prepare('SELECT * FROM employees ORDER BY id').all()
  const absences = db.prepare(`
    SELECT a.*, e.name AS employee_name FROM absences a
    JOIN employees e ON e.id = a.employee_id ORDER BY a.start_date
  `).all()
  const events = db.prepare('SELECT * FROM events ORDER BY event_date').all()
  const people = onboardingList()

  let reply = ''
  if (/who.*(leave|off|absent|out)|on leave today|out today/.test(q)) {
    const rows = absences.filter((a) => a.start_date <= today && a.end_date >= today)
    reply = rows.length
      ? `On leave today (${today}): ` + rows.map((a) => `${a.employee_name} (${a.type}, ${a.status})`).join('; ') + '.'
      : `Nobody is on leave today (${today}).`
  } else if (/pending|approval/.test(q)) {
    const rows = absences.filter((a) => a.status === 'Pending')
    reply = rows.length
      ? `${rows.length} pending approval${rows.length === 1 ? '' : 's'}: ` + rows.map((a) => `${a.employee_name} — ${a.type} (${fmtRange(a)})`).join('; ') + '.'
      : 'There are no pending approvals.'
  } else if (/headcount|how many employee|manage user|who works/.test(q)) {
    reply = `Headcount is ${employees.length}. ` + employees.slice(0, 5).map((e) => e.name).join(', ') + (employees.length > 5 ? `, and ${employees.length - 5} more.` : '.')
  } else if (/event|summit|meetup|workshop|calendar/.test(q)) {
    reply = events.length
      ? 'Upcoming events: ' + events.map((e) => `${e.title} on ${e.event_date} (${e.start_time}–${e.end_time})${e.badge ? `, ${e.badge}` : ''}`).join('; ') + '.'
      : 'No events are scheduled.'
  } else if (/onboard/.test(q)) {
    reply = people.map((p) => `${p.name} (${p.role_title}) ${p.done}/${p.total} tasks done`).join('; ') + '.'
  } else if (/report|this month|statistic|stats/.test(q)) {
    const month = today.slice(0, 7)
    const monthAbs = absences.filter((a) => a.end_date >= `${month}-01` && a.start_date <= `${month}-31`)
    const pending = absences.filter((a) => a.status === 'Pending').length
    reply = `December 2025 report: ${employees.length} employees, ${monthAbs.length} absences overlapping this month, ${pending} pending approvals.`
  } else if (/paid leave|sick|vacation/.test(q)) {
    const type = /sick/.test(q) ? 'Sick Leave' : /vacation/.test(q) ? 'Vacation' : 'Paid Leave'
    const rows = absences.filter((a) => a.type === type)
    reply = rows.length
      ? `${type}: ` + rows.map((a) => `${a.employee_name} ${fmtRange(a)} (${a.status})`).join('; ') + '.'
      : `No ${type.toLowerCase()} requests yet.`
  } else if (/create a profile|add employee|new employee/.test(q)) {
    reply = 'Use + Add Employee in the top bar. Name, email, role, and department are saved immediately and show up on the Employees page and the absence grid.'
  } else if (/help|what can you|anything/.test(q)) {
    reply = 'I can answer from Absora data: who is on leave today, pending approvals, headcount, events, onboarding progress, and this month’s absence report.'
  } else {
    reply = 'Try who is on leave today, pending approvals, headcount, or upcoming events.'
  }
  res.json({ reply })
})

const dist = path.join(__dirname, '..', 'dist')
app.use(express.static(dist))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Not found' })
  })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong.' })
})

const HOST = process.env.HOST || '127.0.0.1'
app.listen(PORT, HOST, () => {
  console.log(`Absora listening on ${HOST}:${PORT}`)
})
