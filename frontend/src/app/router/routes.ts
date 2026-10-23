import type { RouteRecordRaw } from 'vue-router'
import BlankLayout from '@/shared/layouts/blank/BlankLayout.vue'
import FullLayout from '@/shared/layouts/full/FullLayout.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: { name: 'tasks' },
  },
  {
    path: '/auth',
    component: BlankLayout,
    meta: { guestOnly: true },
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/modules/auth/ui/pages/LoginPage.vue'),
        meta: { guestOnly: true, title: 'Sign in' },
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('@/modules/auth/ui/pages/RegisterPage.vue'),
        meta: { guestOnly: true, title: 'Create account' },
      },
    ],
  },
  {
    path: '/tasks',
    component: FullLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'tasks',
        component: () => import('@/modules/tasks/ui/pages/TasksListPage.vue'),
        meta: { requiresAuth: true, title: 'Tasks' },
      },
      {
        path: ':id',
        name: 'task-detail',
        component: () => import('@/modules/tasks/ui/pages/TaskDetailPage.vue'),
        props: true,
        meta: { requiresAuth: true, title: 'Task details' },
      },
    ],
  },
  {
    path: '/users',
    component: FullLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'users',
        component: () => import('@/modules/users/ui/pages/UsersListPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: 'Users' },
      },
      {
        path: 'create',
        name: 'user-create',
        component: () => import('@/modules/users/ui/pages/UserCreatePage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: 'Create user' },
      },
      {
        path: ':id/edit',
        name: 'user-edit',
        component: () => import('@/modules/users/ui/pages/UserEditPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: 'Edit user' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'tasks' },
  },
]
