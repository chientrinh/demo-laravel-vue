<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { createTaskSchema, type CreateTaskFormValues } from '../../domain/schemas'
import type { Task, TaskInput } from '../../domain/types'
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/shared/constants/task'
import type { AssigneeOption } from '@/shared/utils/task'
import { formatDate, toDateInput } from '@/shared/utils/date'
import { userService } from '@/modules/users'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    task?: Task | null
    assignees: AssigneeOption[]
    defaultAssigneeId?: string
    loading?: boolean
  }>(),
  {
    task: null,
    defaultAssigneeId: '',
    loading: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [input: TaskInput]
}>()

const dateMenu = ref(false)
const isEditing = computed(() => Boolean(props.task))
const users = ref<AssigneeOption[]>([])
const loadingUsers = ref(false)

const assigneeItems = computed<AssigneeOption[]>(() => {
  const map = new Map<string, AssigneeOption>()
  for (const user of users.value) map.set(user.id, user)
  for (const assignee of props.assignees) {
    if (!map.has(assignee.id)) map.set(assignee.id, assignee)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
})

async function loadUsers(): Promise<void> {
  loadingUsers.value = true
  try {
    users.value = await userService.list()
  } catch {
    users.value = []
  } finally {
    loadingUsers.value = false
  }
}

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm<CreateTaskFormValues>({
  validationSchema: toTypedSchema(createTaskSchema),
  initialValues: {
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignedTo: '',
    dueDate: null,
  },
})

const [title, titleProps] = defineField('title')
const [description, descriptionProps] = defineField('description')
const [status, statusProps] = defineField('status')
const [priority, priorityProps] = defineField('priority')
const [assignedTo, assignedToProps] = defineField('assignedTo')
const [dueDate, dueDateProps] = defineField('dueDate')

const dueDateLabel = computed(() => (dueDate.value ? formatDate(dueDate.value) : 'No due date'))

function initialValues(): CreateTaskFormValues {
  if (props.task) {
    return {
      title: props.task.title,
      description: props.task.description,
      status: props.task.status,
      priority: props.task.priority,
      assignedTo: props.task.assignedTo,
      dueDate: toDateInput(props.task.dueDate) || null,
    }
  }
  return {
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignedTo: props.defaultAssigneeId || props.assignees[0]?.id || '',
    dueDate: null,
  }
}

function prepareForm(): void {
  resetForm({ values: initialValues() })
  dateMenu.value = false
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    prepareForm()
    void loadUsers()
  },
)

watch(
  () => props.task,
  () => {
    if (props.modelValue) prepareForm()
  },
)

function normalizeDate(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return toDateInput(value)
  if (Array.isArray(value)) return normalizeDate(value[0])
  return toDateInput(String(value))
}

function onDateSelected(value: unknown): void {
  dueDate.value = normalizeDate(value)
  dateMenu.value = false
}

function close(): void {
  if (props.loading || isSubmitting.value) return
  emit('update:modelValue', false)
}

const submit = handleSubmit((values) => {
  emit('submit', {
    ...values,
    description: values.description ?? '',
    dueDate: values.dueDate || null,
  })
})

</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="700"
    persistent
    scrollable
    @update:model-value="!$event && close()"
  >
    <v-card class="task-form-dialog">
      <v-form @submit.prevent="submit">
        <div class="d-flex align-start justify-space-between pa-6 pb-5">
          <div>
            <p class="eyebrow mb-1">{{ isEditing ? 'Update work item' : 'New work item' }}</p>
            <h2 class="text-h5 font-weight-bold mb-1">
              {{ isEditing ? 'Edit task' : 'Create a task' }}
            </h2>
            <p class="text-body-2 text-muted mb-0">
              Give your team a clear next step and a named owner.
            </p>
          </div>
          <v-btn icon="mdi-close" variant="text" color="medium-emphasis" @click="close" />
        </div>

        <v-divider class="soft-divider" />

        <v-card-text class="pa-6">
          <v-alert
            v-if="!loadingUsers && assigneeItems.length === 0"
            type="warning"
            variant="tonal"
            density="comfortable"
            class="mb-5"
          >
            No assignees are available yet. Create a task from the seeded workspace first.
          </v-alert>

          <v-label class="text-body-2 font-weight-medium mb-2">Task title *</v-label>
          <v-text-field
            v-model="title"
            v-bind="titleProps"
            placeholder="e.g. Finalize the Q3 roadmap"
            prepend-inner-icon="mdi-format-title"
            :error-messages="errors.title"
            :counter="120"
            maxlength="120"
            autofocus
            class="mb-1"
          />

          <v-label class="text-body-2 font-weight-medium mb-2">Description</v-label>
          <v-textarea
            v-model="description"
            v-bind="descriptionProps"
            placeholder="Add context, acceptance criteria, or useful links…"
            rows="4"
            maxlength="2000"
            counter="2000"
            :error-messages="errors.description"
            class="mb-1"
          />

          <v-row dense class="mt-1">
            <v-col cols="12" sm="6">
              <v-label class="text-body-2 font-weight-medium mb-2">Status</v-label>
              <v-select
                v-model="status"
                v-bind="statusProps"
                :items="STATUS_OPTIONS"
                item-title="title"
                item-value="value"
                :error-messages="errors.status"
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps" :prepend-icon="item.raw.icon" />
                </template>
              </v-select>
            </v-col>
            <v-col cols="12" sm="6">
              <v-label class="text-body-2 font-weight-medium mb-2">Priority</v-label>
              <v-select
                v-model="priority"
                v-bind="priorityProps"
                :items="PRIORITY_OPTIONS"
                item-title="title"
                item-value="value"
                :error-messages="errors.priority"
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps" :prepend-icon="item.raw.icon" />
                </template>
              </v-select>
            </v-col>
          </v-row>

          <v-row dense>
            <v-col cols="12" sm="6">
              <v-label class="text-body-2 font-weight-medium mb-2">Assignee *</v-label>
              <v-select
                v-model="assignedTo"
                v-bind="assignedToProps"
                :items="assigneeItems"
                :loading="loadingUsers"
                item-title="name"
                item-value="id"
                placeholder="Choose a teammate"
                :error-messages="errors.assignedTo"
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item
                    v-bind="itemProps"
                    :title="item.raw.name"
                    :subtitle="item.raw.email"
                  />
                </template>
              </v-select>
            </v-col>
            <v-col cols="12" sm="6">
              <v-label class="text-body-2 font-weight-medium mb-2">Due date</v-label>
              <v-menu
                v-model="dateMenu"
                :close-on-content-click="false"
                location="bottom start"
              >
                <template #activator="{ props: activatorProps }">
                  <v-text-field
                    v-bind="{ ...activatorProps, ...dueDateProps }"
                    :model-value="dueDateLabel"
                    readonly
                    placeholder="Pick a date"
                    prepend-inner-icon="mdi-calendar-outline"
                    :error-messages="errors.dueDate"
                    append-inner-icon="mdi-close"
                    @click:append-inner="dueDate = null"
                  />
                </template>
                <v-card rounded="xl" elevation="12">
                  <v-date-picker
                    :model-value="dueDate || null"
                    color="primary"
                    show-adjacent-months
                    @update:model-value="onDateSelected"
                  />
                  <div class="d-flex justify-end pa-3 pt-0">
                    <v-btn variant="text" size="small" @click="dateMenu = false">Close</v-btn>
                  </div>
                </v-card>
              </v-menu>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider class="soft-divider" />

        <v-card-actions class="pa-6">
          <v-btn variant="text" @click="close">Cancel</v-btn>
          <v-spacer />
          <v-btn
            type="submit"
            color="primary"
            variant="flat"
            :loading="loading || isSubmitting"
            :prepend-icon="isEditing ? 'mdi-content-save-outline' : 'mdi-plus'"
          >
            {{ isEditing ? 'Save changes' : 'Create task' }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.task-form-dialog {
  border: 1px solid #e7e0ec;
  max-height: 92vh;
}
</style>
