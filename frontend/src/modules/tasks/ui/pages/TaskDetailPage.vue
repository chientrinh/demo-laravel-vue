<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth'
import taskService from '../../application/services/task.service'
import type { Task, TaskInput } from '../../domain/types'
import TaskFormDialog from '../components/TaskFormDialog.vue'
import StatusChip from '@/shared/components/common/StatusChip.vue'
import PriorityChip from '@/shared/components/common/PriorityChip.vue'
import ErrorState from '@/shared/components/common/ErrorState.vue'
import ConfirmDialog from '@/shared/components/common/ConfirmDialog.vue'
import { useToast } from '@/shared/composables/useToast'
import { getApiErrorMessage } from '@/adapters/infrastructures/clients/HttpClient'
import { avatarColor, formatTaskCode, getInitials, type AssigneeOption } from '@/shared/utils/task'
import { formatDate, formatDateTime, isOverdue } from '@/shared/utils/date'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const task = ref<Task | null>(null)
const loading = ref(true)
const error = ref('')
const formOpen = ref(false)
const saving = ref(false)
const deleteOpen = ref(false)
const deleting = ref(false)
const statusUpdating = ref(false)

const taskId = computed(() => String(route.params.id ?? ''))

const assignees = computed<AssigneeOption[]>(() => {
  const options: AssigneeOption[] = []
  if (task.value?.assignee) {
    options.push({
      id: task.value.assignee.id,
      name: task.value.assignee.name,
      email: task.value.assignee.email,
      role: task.value.assignee.role,
    })
  }
  if (authStore.user && !options.some((option) => option.id === authStore.user?.id)) {
    options.push({
      id: authStore.user.id,
      name: authStore.user.name,
      email: authStore.user.email,
      role: authStore.user.role,
    })
  }
  return options
})

const overdue = computed(() => isOverdue(task.value?.dueDate, task.value?.status))

function toInput(source: Task, overrides: Partial<TaskInput> = {}): TaskInput {
  return {
    title: source.title,
    description: source.description,
    status: source.status,
    priority: source.priority,
    assignedTo: source.assignedTo,
    dueDate: source.dueDate ? source.dueDate.toISOString().slice(0, 10) : null,
    ...overrides,
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    task.value = await taskService.get(taskId.value)
  } catch (caught) {
    task.value = null
    error.value = getApiErrorMessage(caught)
  } finally {
    loading.value = false
  }
}

watch(taskId, () => {
  void load()
})

onMounted(() => {
  void load()
})

async function saveTask(input: TaskInput): Promise<void> {
  if (!task.value) return
  saving.value = true
  try {
    task.value = await taskService.update(task.value.id, input)
    formOpen.value = false
    toast.success('Task updated successfully.')
  } catch (caught) {
    toast.error(getApiErrorMessage(caught))
  } finally {
    saving.value = false
  }
}

async function toggleComplete(): Promise<void> {
  if (!task.value) return
  statusUpdating.value = true
  try {
    const nextStatus = task.value.status === 'done' ? 'todo' : 'done'
    task.value = await taskService.update(task.value.id, toInput(task.value, { status: nextStatus }))
    toast.success(nextStatus === 'done' ? 'Task marked complete.' : 'Task reopened.')
  } catch (caught) {
    toast.error(getApiErrorMessage(caught))
  } finally {
    statusUpdating.value = false
  }
}

async function confirmDelete(): Promise<void> {
  if (!task.value) return
  deleting.value = true
  try {
    await taskService.remove(task.value.id)
    toast.success('Task deleted.')
    void router.replace({ name: 'tasks' })
  } catch (caught) {
    toast.error(getApiErrorMessage(caught))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="task-detail-page p-4!">
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6">
      <v-btn
        variant="text"
        color="medium-emphasis"
        prepend-icon="mdi-arrow-left"
        class="px-2"
        @click="router.push({ name: 'tasks' })"
      >
        Back to tasks
      </v-btn>
      <div v-if="task" class="d-flex flex-wrap align-center ga-2">
        <v-btn
          variant="tonal"
          color="primary"
          :loading="statusUpdating"
          :prepend-icon="task.status === 'done' ? 'mdi-undo-variant' : 'mdi-check'"
          @click="toggleComplete"
        >
          {{ task.status === 'done' ? 'Reopen task' : 'Mark complete' }}
        </v-btn>
        <v-btn
          variant="tonal"
          prepend-icon="mdi-pencil-outline"
          @click="formOpen = true"
        >
          Edit
        </v-btn>
        <v-btn
          v-if="authStore.isAdmin"
          variant="text"
          color="error"
          prepend-icon="mdi-trash-can-outline"
          @click="deleteOpen = true"
        >
          Delete
        </v-btn>
      </div>
    </div>

    <v-card v-if="loading" class="detail-card pa-6" elevation="0">
      <v-skeleton-loader type="heading, text, text, divider, list-item-two-line" />
    </v-card>

    <v-card v-else-if="error" class="detail-card" elevation="0">
      <ErrorState :message="error" @retry="load" />
    </v-card>

    <template v-else-if="task">
      <v-card class="detail-card pa-6 pa-sm-8 mb-5" elevation="0">
        <div class="d-flex flex-wrap align-center ga-2 mb-4">
          <span class="text-caption font-weight-bold text-muted text-uppercase">
            {{ formatTaskCode(task.id) }}
          </span>
          <v-divider vertical class="mx-2" />
          <StatusChip :status="task.status" />
          <PriorityChip :priority="task.priority" />
          <v-chip v-if="overdue" color="error" variant="tonal" size="small" prepend-icon="mdi-alert">
            Overdue
          </v-chip>
        </div>

        <h1 class="text-h4 font-weight-bold mb-4">{{ task.title }}</h1>

        <p class="text-body-2 text-muted mb-0">
          Created {{ formatDateTime(task.createdAt) }} · Last updated
          {{ formatDateTime(task.updatedAt) }}
        </p>
      </v-card>

      <v-row>
        <v-col cols="12" lg="8">
          <v-card class="detail-card pa-6 pa-sm-7" elevation="0">
            <h2 class="text-subtitle-1 font-weight-bold mb-4">Description</h2>
            <p v-if="task.description" class="text-body-1 description-text mb-0">
              {{ task.description }}
            </p>
            <p v-else class="text-body-2 text-muted mb-0">
              No description has been added to this task yet.
            </p>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card class="detail-card pa-6" elevation="0">
            <h2 class="text-subtitle-1 font-weight-bold mb-5">Task details</h2>

            <div class="detail-row">
              <span class="detail-label">Assignee</span>
              <div v-if="task.assignee" class="d-flex align-center ga-3 mt-2">
                <v-avatar :color="avatarColor(task.assignee.id)" variant="tonal" size="38">
                  <span class="text-caption font-weight-bold">
                    {{ getInitials(task.assignee.name) }}
                  </span>
                </v-avatar>
                <div>
                  <p class="text-body-2 font-weight-medium mb-0">{{ task.assignee.name }}</p>
                  <p class="text-caption text-muted mb-0">{{ task.assignee.email }}</p>
                </div>
              </div>
              <p v-else class="text-body-2 mb-0 mt-1">Unassigned</p>
            </div>

            <v-divider class="soft-divider my-4" />

            <div class="detail-row">
              <span class="detail-label">Due date</span>
              <p class="text-body-2 mb-0 mt-1" :class="{ 'text-error font-weight-medium': overdue }">
                {{ task.dueDate ? formatDate(task.dueDate) : 'No due date' }}
              </p>
            </div>

            <v-divider class="soft-divider my-4" />

            <div class="detail-row">
              <span class="detail-label">Priority</span>
              <div class="mt-2">
                <PriorityChip :priority="task.priority" />
              </div>
            </div>

            <v-divider class="soft-divider my-4" />

            <div class="detail-row">
              <span class="detail-label">Status</span>
              <div class="mt-2">
                <StatusChip :status="task.status" />
              </div>
            </div>

            <v-divider class="soft-divider my-4" />

            <div class="detail-row">
              <span class="detail-label">Created</span>
              <p class="text-body-2 mb-0 mt-1">{{ formatDate(task.createdAt) }}</p>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <TaskFormDialog
        v-model="formOpen"
        :task="task"
        :assignees="assignees"
        :loading="saving"
        @submit="saveTask"
      />

      <ConfirmDialog
        v-model="deleteOpen"
        title="Delete this task?"
        :message="`“${task.title}” will be permanently removed for everyone.`"
        :loading="deleting"
        @confirm="confirmDelete"
      />
    </template>
  </div>
</template>

<style scoped>
.detail-card {
  border: 1px solid #e7e0ec;
  border-radius: 18px;
}

.description-text {
  white-space: pre-wrap;
  line-height: 1.75;
  color: #49454f;
}

.detail-label {
  color: #6f6a75;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.detail-row {
  min-height: 36px;
}
</style>
