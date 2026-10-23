<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/modules/auth'
import { useTaskList } from '../composables/useTaskList'
import TaskFormDialog from '../components/TaskFormDialog.vue'
import EmptyState from '@/shared/components/common/EmptyState.vue'
import ErrorState from '@/shared/components/common/ErrorState.vue'
import ConfirmDialog from '@/shared/components/common/ConfirmDialog.vue'
import StatusChip from '@/shared/components/common/StatusChip.vue'
import PriorityChip from '@/shared/components/common/PriorityChip.vue'
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/shared/constants/task'
import { avatarColor, formatTaskCode, getInitials } from '@/shared/utils/task'
import { formatDate, isOverdue } from '@/shared/utils/date'
import type { Task } from '../../domain/types'

const authStore = useAuthStore()
const {
  tasks,
  meta,
  loading,
  initialLoading,
  error,
  filters,
  searchInput,
  formOpen,
  editingTask,
  saving,
  deleteTarget,
  deleting,
  assigneeOptions,
  defaultAssigneeId,
  stats,
  hasActiveFilters,
  showingRange,
  refresh,
  setStatus,
  setPriority,
  setAssignee,
  setPage,
  setPerPage,
  clearFilters,
  openCreate,
  openEdit,
  saveTask,
  askDelete,
  confirmDelete,
  openDetail,
} = useTaskList()

const headers = [
  { title: 'Task', key: 'title', sortable: false, minWidth: '280px' },
  { title: 'Assignee', key: 'assignee', sortable: false, width: '200px' },
  { title: 'Due date', key: 'dueDate', sortable: false, width: '150px' },
  { title: 'Priority', key: 'priority', sortable: false, width: '130px' },
  { title: 'Status', key: 'status', sortable: false, width: '150px' },
  { title: '', key: 'actions', sortable: false, width: '64px', align: 'end' as const },
]

const statCards = computed(() => [
  {
    label: 'Total tasks',
    value: stats.value.total,
    icon: 'mdi-clipboard-text-multiple-outline',
    color: 'primary',
  },
  {
    label: 'In progress',
    value: stats.value.inProgress,
    icon: 'mdi-progress-clock',
    color: 'warning',
  },
  {
    label: 'Completed',
    value: stats.value.done,
    icon: 'mdi-check-circle-outline',
    color: 'success',
  },
  {
    label: 'Overdue',
    value: stats.value.overdue,
    icon: 'mdi-alert-circle-outline',
    color: 'error',
  },
])

const myTasksActive = computed(
  () => Boolean(authStore.user) && filters.assigned_to === authStore.user?.id,
)

function toggleMyTasks(): void {
  setAssignee(myTasksActive.value ? null : (authStore.user?.id ?? null))
}

function dueDateClass(task: Task): string {
  return isOverdue(task.dueDate, task.status) ? 'text-error font-weight-medium' : ''
}
</script>

<template>
  <div class="tasks-page p-4!">
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-7">
      <div>
        <p class="eyebrow mb-1">Workspace overview</p>
        <h1 class="text-h4 font-weight-bold mb-1">Tasks</h1>
        <p class="text-body-2 text-muted mb-0">
          Track priorities, owners, and deadlines across your team.
        </p>
      </div>
      <v-btn
        color="primary"
        size="large"
        rounded="lg"
        prepend-icon="mdi-plus"
        @click="openCreate"
      >
        New task
      </v-btn>
    </div>

    <v-row class="mb-1">
      <v-col v-for="card in statCards" :key="card.label" cols="12" sm="6" lg="3">
        <v-card class="stat-card pa-5" elevation="0">
          <div class="d-flex align-center justify-space-between">
            <div>
              <p class="text-body-2 text-muted mb-1">{{ card.label }}</p>
              <p class="text-h4 font-weight-bold mb-0">{{ card.value }}</p>
            </div>
            <v-avatar :color="card.color" variant="tonal" rounded="lg" size="48">
              <v-icon :icon="card.icon" size="24" />
            </v-avatar>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="filter-card pa-4 pa-sm-5 mt-3 mb-5" elevation="0">
      <div class="d-flex flex-wrap align-center ga-3">
        <v-text-field
          v-model="searchInput"
          placeholder="Search tasks by title…"
          prepend-inner-icon="mdi-magnify"
          density="comfortable"
          hide-details
          clearable
          class="filter-search"
          @click:clear="searchInput = ''"
        />
        <v-select
          :model-value="filters.status ?? null"
          :items="STATUS_OPTIONS"
          item-title="title"
          item-value="value"
          label="Status"
          density="comfortable"
          hide-details
          clearable
          class="filter-select"
          @update:model-value="setStatus"
        />
        <v-select
          :model-value="filters.priority ?? null"
          :items="PRIORITY_OPTIONS"
          item-title="title"
          item-value="value"
          label="Priority"
          density="comfortable"
          hide-details
          clearable
          class="filter-select"
          @update:model-value="setPriority"
        />
        <v-select
          v-if="authStore.isAdmin"
          :model-value="filters.assigned_to ?? null"
          :items="assigneeOptions"
          item-title="name"
          item-value="id"
          label="Assignee"
          density="comfortable"
          hide-details
          clearable
          class="filter-select filter-assignee"
          @update:model-value="setAssignee"
        />
        <v-btn
          :variant="myTasksActive ? 'flat' : 'tonal'"
          :color="myTasksActive ? 'primary' : 'default'"
          prepend-icon="mdi-account-check-outline"
          @click="toggleMyTasks"
        >
          My tasks
        </v-btn>
        <v-btn
          v-if="hasActiveFilters"
          variant="text"
          color="medium-emphasis"
          prepend-icon="mdi-filter-off-outline"
          @click="clearFilters"
        >
          Clear
        </v-btn>
      </div>
    </v-card>

    <v-card class="table-card" elevation="0">
      <v-skeleton-loader
        v-if="initialLoading && tasks.length === 0"
        type="table-heading, table-thead, table-tbody"
      />

      <ErrorState
        v-else-if="error && tasks.length === 0"
        :message="error"
        @retry="refresh()"
      />

      <template v-else>
        <v-alert
          v-if="error"
          type="warning"
          variant="tonal"
          density="comfortable"
          class="ma-4 mb-0"
        >
          {{ error }}
        </v-alert>

        <v-data-table
          :headers="headers"
          :items="tasks"
          item-value="id"
          :loading="loading"
          hide-default-footer
          hover
          class="task-table"
        >
          <template #item.title="{ item }">
            <div class="py-1">
              <button type="button" class="task-title" @click="openDetail(item)">
                {{ item.title }}
              </button>
              <div class="d-flex align-center ga-2 mt-1">
                <span class="text-caption text-muted">{{ formatTaskCode(item.id) }}</span>
                <span class="text-caption text-muted">·</span>
                <span class="text-caption text-muted">
                  Created {{ formatDate(item.createdAt) }}
                </span>
              </div>
            </div>
          </template>

          <template #item.assignee="{ item }">
            <div v-if="item.assignee" class="d-flex align-center ga-3">
              <v-avatar :color="avatarColor(item.assignee.id)" size="34" variant="tonal">
                <span class="text-caption font-weight-bold">
                  {{ getInitials(item.assignee.name) }}
                </span>
              </v-avatar>
              <div>
                <p class="text-body-2 font-weight-medium mb-0">{{ item.assignee.name }}</p>
                <p class="text-caption text-muted mb-0">{{ item.assignee.email }}</p>
              </div>
            </div>
            <span v-else class="text-caption text-muted">Unassigned</span>
          </template>

          <template #item.dueDate="{ item }">
            <span :class="dueDateClass(item)" class="text-body-2">
              {{ item.dueDate ? formatDate(item.dueDate) : 'No due date' }}
            </span>
          </template>

          <template #item.priority="{ item }">
            <PriorityChip :priority="item.priority" />
          </template>

          <template #item.status="{ item }">
            <StatusChip :status="item.status" />
          </template>

          <template #item.actions="{ item }">
            <v-menu location="bottom end">
              <template #activator="{ props: menuProps }">
                <v-btn
                  v-bind="menuProps"
                  icon="mdi-dots-horizontal"
                  variant="text"
                  size="small"
                  color="medium-emphasis"
                />
              </template>
              <v-list density="compact" min-width="180">
                <v-list-item
                  prepend-icon="mdi-eye-outline"
                  title="View details"
                  @click="openDetail(item)"
                />
                <v-list-item
                  prepend-icon="mdi-pencil-outline"
                  title="Edit task"
                  @click="openEdit(item)"
                />
                <v-divider v-if="authStore.isAdmin" class="my-1" />
                <v-list-item
                  v-if="authStore.isAdmin"
                  prepend-icon="mdi-trash-can-outline"
                  title="Delete task"
                  base-color="error"
                  @click="askDelete(item)"
                />
              </v-list>
            </v-menu>
          </template>

          <template #no-data>
            <EmptyState
              :title="hasActiveFilters ? 'No matching tasks' : 'Your task list is empty'"
              :description="
                hasActiveFilters
                  ? 'Try adjusting your search or filters to find what you need.'
                  : 'Create your first task and give your team a clear next step.'
              "
            >
              <v-btn v-if="hasActiveFilters" variant="tonal" color="primary" @click="clearFilters">
                Clear filters
              </v-btn>
              <v-btn v-else color="primary" prepend-icon="mdi-plus" @click="openCreate">
                Create task
              </v-btn>
            </EmptyState>
          </template>
        </v-data-table>

        <div v-if="meta.total > 0" class="table-footer">
          <div class="d-flex align-center ga-2">
            <span class="text-caption text-muted">Rows per page</span>
            <v-select
              :model-value="meta.perPage"
              :items="[10, 15, 25]"
              density="compact"
              hide-details
              class="per-page-select"
              @update:model-value="setPerPage"
            />
            <span class="text-caption text-muted ms-2">{{ showingRange }}</span>
          </div>
          <v-pagination
            v-if="meta.lastPage > 1"
            :model-value="meta.currentPage"
            :length="meta.lastPage"
            :total-visible="5"
            density="comfortable"
            @update:model-value="setPage"
          />
        </div>
      </template>
    </v-card>

    <TaskFormDialog
      v-model="formOpen"
      :task="editingTask"
      :assignees="assigneeOptions"
      :default-assignee-id="defaultAssigneeId"
      :loading="saving"
      @submit="saveTask"
    />

    <ConfirmDialog
      :model-value="Boolean(deleteTarget)"
      title="Delete this task?"
      :message="`“${deleteTarget?.title ?? ''}” will be permanently removed for everyone.`"
      :loading="deleting"
      @update:model-value="!$event && (deleteTarget = null)"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.stat-card,
.filter-card,
.table-card {
  border: 1px solid #e7e0ec;
  border-radius: 18px;
}

.filter-search {
  flex: 1 1 260px;
  min-width: 220px;
}

.filter-select {
  flex: 0 1 160px;
  min-width: 140px;
}

.filter-assignee {
  flex-basis: 190px;
}

.task-table :deep(.v-data-table__th) {
  color: #6f6a75;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.task-table :deep(tr:hover) {
  cursor: default;
}

.task-title {
  background: none;
  border: none;
  padding: 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.925rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.task-title:hover {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  text-underline-offset: 3px;
}

.table-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-top: 1px solid #eee8f3;
}

.per-page-select {
  max-width: 88px;
}
</style>
