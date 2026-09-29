import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const APP_TODAY = '2025-12-09'

const TASKS = [
  'Sign employment contract',
  'Submit ID documents',
  'Set up email account',
  'Join team Slack',
  'Complete security training',
  'Meet your manager',
  'Read the handbook',
  'Set up your laptop',
  'Benefits enrollment',
  'First week check-in',
]

export function openDb() {
  const file = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'absora.db')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role_title TEXT NOT NULL,
      department TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS absences (
      id INTEGER PRIMARY KEY,
      employee_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      note TEXT DEFAULT '',
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      event_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      badge TEXT DEFAULT '',
      highlighted INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS onboarding_people (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      role_title TEXT NOT NULL,
      color TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS onboarding_tasks (
      id INTEGER PRIMARY KEY,
      person_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (person_id) REFERENCES onboarding_people(id) ON DELETE CASCADE
    );
  `)
  seed(db)
  return db
}

function seed(db) {
  const n = db.prepare('SELECT COUNT(*) AS c FROM employees').get().c
  if (n > 0) return
  const insertEmp = db.prepare(
    `INSERT INTO employees (name, email, role_title, department, color, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  )
  const people = [
    ['Ethan Parker', 'ethan.parker@absora.local', 'Software Engineer', 'Engineering', '#4C7DFF'],
    ['Liam Carter', 'liam.carter@absora.local', 'UI/UX Designer', 'Design', '#F2A15A'],
    ['Noah Mitchell', 'noah.mitchell@absora.local', 'Backend Developer', 'Engineering', '#7B6CF6'],
    ['Ava Thompson', 'ava.thompson@absora.local', 'Product Manager', 'Product', '#F07A93'],
    ['Mia Robinson', 'mia.robinson@absora.local', 'QA Engineer', 'Engineering', '#2BB5A0'],
    ['Olivia Bennett', 'olivia.bennett@absora.local', 'Data Analyst', 'Data', '#5C6BC0'],
    ['James Cooper', 'james.cooper@absora.local', 'DevOps Engineer', 'Engineering', '#E07A5F'],
    ['Harper Diaz', 'harper.diaz@absora.local', 'Frontend Developer', 'Engineering', '#3D8BFD'],
    ['Benjamin Brooks', 'benjamin.brooks@absora.local', 'HR Specialist', 'People', '#8D6E63'],
    ['Charlotte Lee', 'charlotte.lee@absora.local', 'Product Designer', 'Design', '#EC7CA0'],
    ['Henry Ward', 'henry.ward@absora.local', 'Account Executive', 'Sales', '#26A69A'],
    ['Amelia Foster', 'amelia.foster@absora.local', 'Support Lead', 'Support', '#7E57C2'],
  ]
  const now = new Date().toISOString()
  const ids = {}
  const tx = db.transaction(() => {
    for (const row of people) {
      const info = insertEmp.run(...row, now)
      ids[row[0]] = info.lastInsertRowid
    }
    const abs = db.prepare(
      `INSERT INTO absences (employee_id, type, status, start_date, end_date, note) VALUES (?, ?, ?, ?, ?, ?)`
    )
    abs.run(ids['Ethan Parker'], 'Paid Leave', 'Approved', '2025-12-03', '2025-12-05', '')
    abs.run(ids['Liam Carter'], 'Sick Leave', 'Pending', '2025-12-08', '2025-12-10', '')
    abs.run(ids['Noah Mitchell'], 'Vacation', 'Approved', '2025-12-10', '2025-12-14', '')
    abs.run(ids['Ava Thompson'], 'Paid Leave', 'Approved', '2025-12-01', '2025-12-02', '')
    abs.run(ids['Mia Robinson'], 'Sick Leave', 'Pending', '2025-12-12', '2025-12-13', '')
    abs.run(ids['Olivia Bennett'], 'Vacation', 'Approved', '2025-12-04', '2025-12-05', '')
    abs.run(ids['Harper Diaz'], 'Paid Leave', 'Approved', '2025-12-18', '2025-12-19', '')

    const ev = db.prepare(
      `INSERT INTO events (title, subtitle, event_date, start_time, end_time, badge, highlighted) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    ev.run('Tech Innovations Summit', 'Cutting-edge AI trends', '2025-12-05', '14:00', '15:00', 'In 15 min', 1)
    ev.run('Software Dev Meetup', 'Building resilient APIs', '2025-12-08', '16:00', '17:30', '', 0)
    ev.run('Cybersecurity Workshop', 'Threat modeling basics', '2025-12-12', '10:00', '12:00', '', 0)

    const person = db.prepare(`INSERT INTO onboarding_people (name, role_title, color) VALUES (?, ?, ?)`)
    const task = db.prepare(
      `INSERT INTO onboarding_tasks (person_id, title, done, sort_order) VALUES (?, ?, ?, ?)`
    )
    const onboard = [
      ['Sophia Adams', 'UI/UX Designer', '#F2A15A'],
      ['Lucas Morgan', 'Mobile Developer', '#4C7DFF'],
      ['Mason Reed', 'Cloud Architect', '#7B6CF6'],
      ['Justin Crown', 'Content Designer', '#2BB5A0'],
    ]
    for (const p of onboard) {
      const info = person.run(...p)
      TASKS.forEach((title, i) => task.run(info.lastInsertRowid, title, i < 5 ? 1 : 0, i))
    }
  })
  tx()
}

export const DEFAULT_TASKS = TASKS

export const PALETTE = ['#4C7DFF', '#F2A15A', '#7B6CF6', '#F07A93', '#2BB5A0', '#5C6BC0', '#E07A5F', '#3D8BFD', '#26A69A', '#7E57C2']
