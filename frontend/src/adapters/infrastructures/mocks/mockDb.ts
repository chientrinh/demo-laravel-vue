import type { TaskPriority, TaskStatus } from '@/modules/tasks/domain/types'
import { AUTH_TOKEN_KEY } from '@/shared/constants/auth'

export interface MockUserRecord {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  password: string
  created_at?: string
  updated_at?: string
}

export interface MockTaskRecord {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string
  due_date: string | null
  created_at: string
  updated_at: string
}

interface MockDatabase {
  users: MockUserRecord[]
  tasks: MockTaskRecord[]
}

const DB_KEY = 'ttm.mock.db.v1'

function daysFromNow(days: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function seed(): MockDatabase {
  const users: MockUserRecord[] = [
    { id: '1', name: 'Musharof Chowdhury', email: 'admin@taskflow.dev', role: 'admin', password: 'password123', created_at: daysFromNow(-320), updated_at: daysFromNow(-2) },
    { id: '2', name: 'Olivia Rhye', email: 'olivia@taskflow.dev', role: 'admin', password: 'password123', created_at: daysFromNow(-280), updated_at: daysFromNow(-5) },
    { id: '3', name: 'Phoenix Baker', email: 'phoenix@taskflow.dev', role: 'user', password: 'password123', created_at: daysFromNow(-240), updated_at: daysFromNow(-3) },
    { id: '4', name: 'Lana Steiner', email: 'lana@taskflow.dev', role: 'user', password: 'password123', created_at: daysFromNow(-190), updated_at: daysFromNow(-6) },
    { id: '5', name: 'Demi Wilkinson', email: 'demi@taskflow.dev', role: 'user', password: 'password123', created_at: daysFromNow(-150), updated_at: daysFromNow(-4) },
    { id: '6', name: 'Candice Wu', email: 'candice@taskflow.dev', role: 'user', password: 'password123', created_at: daysFromNow(-90), updated_at: daysFromNow(-1) },
  ]

  const tasks: MockTaskRecord[] = [
    {
      id: 'TSK-2094', title: 'Finalize Q3 product roadmap', description: 'Align product, design, and engineering on the Q3 priorities and publish the final roadmap.',
      status: 'in_progress', priority: 'urgent', assigned_to: '2', due_date: daysFromNow(2),
      created_at: daysFromNow(-12), updated_at: daysFromNow(-1),
    },
    {
      id: 'TSK-2093', title: 'Redesign onboarding flow', description: 'Simplify the first-run experience and reduce the time-to-first-value for new accounts.',
      status: 'todo', priority: 'high', assigned_to: '3', due_date: daysFromNow(6),
      created_at: daysFromNow(-9), updated_at: daysFromNow(-2),
    },
    {
      id: 'TSK-2092', title: 'Fix billing webhook retries', description: 'Webhook retries can duplicate invoice events. Add idempotency keys and alerting.',
      status: 'in_progress', priority: 'urgent', assigned_to: '4', due_date: daysFromNow(-1),
      created_at: daysFromNow(-15), updated_at: daysFromNow(-1),
    },
    {
      id: 'TSK-2091', title: 'Customer interview synthesis', description: 'Summarize the last ten discovery interviews into themes for the planning workshop.',
      status: 'done', priority: 'medium', assigned_to: '5', due_date: daysFromNow(-3),
      created_at: daysFromNow(-20), updated_at: daysFromNow(-3),
    },
    {
      id: 'TSK-2090', title: 'Ship usage analytics dashboard', description: 'Expose weekly active teams, activation, and retention in the internal analytics dashboard.',
      status: 'in_progress', priority: 'high', assigned_to: '6', due_date: daysFromNow(4),
      created_at: daysFromNow(-18), updated_at: daysFromNow(-2),
    },
    {
      id: 'TSK-2089', title: 'Refresh design system tokens', description: 'Consolidate color, spacing, and radius tokens into the shared design system package.',
      status: 'todo', priority: 'medium', assigned_to: '2', due_date: daysFromNow(10),
      created_at: daysFromNow(-7), updated_at: daysFromNow(-4),
    },
    {
      id: 'TSK-2088', title: 'Draft security review checklist', description: 'Create a lightweight checklist for authentication, authorization, and data handling reviews.',
      status: 'todo', priority: 'low', assigned_to: '3', due_date: daysFromNow(14),
      created_at: daysFromNow(-6), updated_at: daysFromNow(-5),
    },
    {
      id: 'TSK-2087', title: 'Resolve mobile navigation overflow', description: 'Long workspace names break the mobile drawer. Truncate labels and add a tooltip.',
      status: 'done', priority: 'high', assigned_to: '4', due_date: daysFromNow(-6),
      created_at: daysFromNow(-22), updated_at: daysFromNow(-6),
    },
    {
      id: 'TSK-2086', title: 'Automate release notes', description: 'Generate release notes from merged pull requests and publish them to the changelog.',
      status: 'in_progress', priority: 'medium', assigned_to: '5', due_date: daysFromNow(8),
      created_at: daysFromNow(-11), updated_at: daysFromNow(-2),
    },
    {
      id: 'TSK-2085', title: 'Archive legacy notifications', description: 'Remove the deprecated notification center from the codebase after the migration window.',
      status: 'cancelled', priority: 'low', assigned_to: '6', due_date: null,
      created_at: daysFromNow(-30), updated_at: daysFromNow(-10),
    },
    {
      id: 'TSK-2084', title: 'Improve empty-state guidance', description: 'Add clearer next steps and documentation links to empty states across the workspace.',
      status: 'todo', priority: 'low', assigned_to: '1', due_date: daysFromNow(16),
      created_at: daysFromNow(-5), updated_at: daysFromNow(-5),
    },
    {
      id: 'TSK-2083', title: 'Quarterly access review', description: 'Review workspace roles and remove access for inactive accounts before the audit.',
      status: 'done', priority: 'urgent', assigned_to: '1', due_date: daysFromNow(-8),
      created_at: daysFromNow(-25), updated_at: daysFromNow(-8),
    },
  ]

  return { users, tasks }
}

function read(): MockDatabase {
  const raw = localStorage.getItem(DB_KEY)
  if (!raw) {
    const initial = seed()
    localStorage.setItem(DB_KEY, JSON.stringify(initial))
    return initial
  }
  try {
    return JSON.parse(raw) as MockDatabase
  } catch {
    const initial = seed()
    localStorage.setItem(DB_KEY, JSON.stringify(initial))
    return initial
  }
}

function write(db: MockDatabase): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export function publicUser(user: MockUserRecord) {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

export function getMockDb(): MockDatabase {
  return read()
}

export function saveMockDb(db: MockDatabase): void {
  write(db)
}

export function getCurrentMockUser(): MockUserRecord | null {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (!token?.startsWith('mock-token-')) return null
  const id = token.replace('mock-token-', '')
  return read().users.find((user) => user.id === id) ?? null
}

export function createMockToken(userId: string): string {
  return `mock-token-${userId}`
}

export function delay(ms = 220): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
