<script setup lang="ts">
import { useUserList } from '../composables/useUserList'
import EmptyState from '@/shared/components/common/EmptyState.vue'
import ErrorState from '@/shared/components/common/ErrorState.vue'
import ConfirmDialog from '@/shared/components/common/ConfirmDialog.vue'
import { avatarColor, getInitials } from '@/shared/utils/task'
import { formatTimestamp } from '@/shared/utils/date'
import type { User } from '../../domain/types'

const {
  users,
  meta,
  loading,
  initialLoading,
  error,
  searchInput,
  roleFilter,
  roleOptions,
  hasActiveFilters,
  showingRange,
  exporting,
  deleteTarget,
  deleting,
  refresh,
  setPage,
  setPerPage,
  clearFilters,
  canDelete,
  askDelete,
  confirmDelete,
  exportCsv,
  openCreate,
  openEdit,
} = useUserList()

const headers = [
  { title: '#', key: 'index', sortable: false, width: '56px' },
  { title: 'Name', key: 'name', sortable: false, minWidth: '220px' },
  { title: 'Email', key: 'email', sortable: false, minWidth: '220px' },
  { title: 'Role', key: 'role', sortable: false, width: '130px' },
  { title: 'Created At', key: 'createdAt', sortable: false, width: '170px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '120px', align: 'end' as const },
]

function rowNumber(user: User): number {
  return (meta.value.currentPage - 1) * meta.value.perPage + users.value.indexOf(user) + 1
}
</script>

<template>
  <div class="users-page p-4!">
    <div class="d-flex flex-wrap align-start justify-space-between ga-4 mb-7">
      <div>
        <p class="eyebrow mb-1">Access control</p>
        <div class="d-flex flex-wrap align-center ga-3">
          <h1 class="text-h4 font-weight-bold mb-0">User Management</h1>
          <v-chip color="primary" variant="tonal" size="small" class="font-weight-bold">
            {{ meta.total }} Total Users
          </v-chip>
          <v-chip
            color="medium-emphasis"
            variant="outlined"
            size="small"
            prepend-icon="mdi-lock-outline"
          >
            Admin Restricted
          </v-chip>
        </div>
        <p class="text-body-2 text-muted mt-2 mb-0">
          Manage team members, their roles, and access to the workspace.
        </p>
      </div>

      <div class="d-flex flex-wrap align-center ga-3">
        <v-btn
          variant="tonal"
          color="primary"
          prepend-icon="mdi-file-download-outline"
          :loading="exporting"
          :disabled="users.length === 0"
          @click="exportCsv"
        >
          Export CSV
        </v-btn>
        <v-btn
          color="primary"
          size="large"
          rounded="lg"
          prepend-icon="mdi-account-plus-outline"
          @click="openCreate"
        >
          Add User
        </v-btn>
      </div>
    </div>

    <v-card class="filter-card pa-4 pa-sm-5 mb-5" elevation="0">
      <div class="d-flex flex-wrap align-center ga-3">
        <v-text-field
          v-model="searchInput"
          placeholder="Search by name or email..."
          prepend-inner-icon="mdi-magnify"
          density="comfortable"
          hide-details
          clearable
          class="filter-search"
          @click:clear="searchInput = ''"
        />
        <v-select
          :model-value="roleFilter"
          :items="roleOptions"
          item-title="title"
          item-value="value"
          label="Role"
          density="comfortable"
          hide-details
          class="filter-select"
          @update:model-value="roleFilter = $event"
        />
        <v-btn
          variant="text"
          color="medium-emphasis"
          prepend-icon="mdi-restart"
          :disabled="!hasActiveFilters"
          @click="clearFilters"
        >
          Reset
        </v-btn>
      </div>
    </v-card>

    <v-card class="table-card" elevation="0">
      <v-skeleton-loader
        v-if="initialLoading && users.length === 0"
        type="table-heading, table-thead, table-tbody"
      />

      <ErrorState
        v-else-if="error && users.length === 0"
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
          :items="users"
          item-value="id"
          :loading="loading"
          hide-default-footer
          hover
          class="user-table"
        >
          <template #item.index="{ item }">
            <span class="text-body-2 text-muted">{{ rowNumber(item) }}</span>
          </template>

          <template #item.name="{ item }">
            <div class="d-flex align-center ga-3 py-1">
              <v-avatar :color="avatarColor(item.id)" size="36" variant="tonal">
                <span class="text-caption font-weight-bold">{{ getInitials(item.name) }}</span>
              </v-avatar>
              <span class="text-body-2 font-weight-medium">{{ item.name }}</span>
            </div>
          </template>

          <template #item.email="{ item }">
            <span class="text-body-2 text-muted">{{ item.email }}</span>
          </template>

          <template #item.role="{ item }">
            <v-chip
              :color="item.role === 'admin' ? 'primary' : 'default'"
              :variant="item.role === 'admin' ? 'tonal' : 'outlined'"
              size="small"
              class="text-capitalize"
              :prepend-icon="item.role === 'admin' ? 'mdi-shield-account-outline' : 'mdi-account-outline'"
            >
              {{ item.role }}
            </v-chip>
          </template>

          <template #item.createdAt="{ item }">
            <span class="text-body-2 text-muted">{{ formatTimestamp(item.createdAt) }}</span>
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex align-center justify-end ga-1">
              <v-btn
                icon="mdi-pencil-outline"
                variant="text"
                size="small"
                color="medium-emphasis"
                title="Edit"
                @click="openEdit(item)"
              />
              <v-tooltip
                :text="canDelete(item) ? 'Delete' : 'You cannot delete your own account'"
                location="top"
              >
                <template #activator="{ props: tooltipProps }">
                  <span v-bind="tooltipProps">
                    <v-btn
                      icon="mdi-trash-can-outline"
                      variant="text"
                      size="small"
                      color="error"
                      title="Delete"
                      :disabled="!canDelete(item)"
                      @click="askDelete(item)"
                    />
                  </span>
                </template>
              </v-tooltip>
            </div>
          </template>

          <template #no-data>
            <EmptyState
              :title="hasActiveFilters ? 'No matching users' : 'No users yet'"
              :description="
                hasActiveFilters
                  ? 'Try adjusting your search or role filter.'
                  : 'Add your first team member to start collaborating.'
              "
            >
              <v-btn v-if="hasActiveFilters" variant="tonal" color="primary" @click="clearFilters">
                Clear filters
              </v-btn>
              <v-btn v-else color="primary" prepend-icon="mdi-account-plus-outline" @click="openCreate">
                Add User
              </v-btn>
            </EmptyState>
          </template>
        </v-data-table>

        <div v-if="meta.total > 0" class="table-footer">
          <div class="d-flex align-center ga-2">
            <span class="text-caption text-muted">Rows per page</span>
            <v-select
              :model-value="meta.perPage"
              :items="[10, 25, 50]"
              density="compact"
              hide-details
              class="per-page-select"
              @update:model-value="setPerPage"
            />
            <span class="text-caption text-muted ms-2">Showing {{ showingRange }} users</span>
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

    <ConfirmDialog
      :model-value="Boolean(deleteTarget)"
      title="Delete user?"
      :message="`“${deleteTarget?.name ?? ''}” (${deleteTarget?.email ?? ''}) will be permanently removed. All tasks assigned to this user will also be deleted.`"
      :loading="deleting"
      @update:model-value="!$event && (deleteTarget = null)"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.filter-card,
.table-card {
  border: 1px solid #e7e0ec;
  border-radius: 18px;
}

.filter-search {
  flex: 1 1 280px;
  min-width: 240px;
}

.filter-select {
  flex: 0 1 180px;
  min-width: 160px;
}

.user-table :deep(.v-data-table__th) {
  color: #6f6a75;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.user-table :deep(tr:hover) {
  cursor: default;
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
