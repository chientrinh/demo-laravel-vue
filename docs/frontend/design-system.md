# Design System — Vuetify 3 + Material Design 3

## Overview

This project uses **Vuetify 3** with **Material Design 3** as the design system. All UI components should follow these guidelines.

---

## Colors

### Primary Palette

```css
/* CSS Variables (shared/styles/variables.scss) */
:root {
  --color-primary: #1976d2;
  --color-primary-light: #42a5f5;
  --color-primary-dark: #1565c0;
  --color-primary-contrast: #ffffff;

  --color-secondary: #9c27b0;
  --color-secondary-light: #ba68c8;
  --color-secondary-dark: #7b1fa2;

  --color-error: #d32f2f;
  --color-warning: #f57c00;
  --color-success: #388e3c;
  --color-info: #0288d1;

  --color-surface: #ffffff;
  --color-surface-variant: #f5f5f5;
  --color-background: #fafafa;
  --color-on-surface: #1d1d1f;
  --color-on-background: #1d1d1f;

  --color-outline: #757575;
  --color-divider: #e0e0e0;
}
```

### Dark Theme

```css
[data-theme="dark"] {
  --color-surface: #1e1e1e;
  --color-surface-variant: #2d2d2d;
  --color-background: #121212;
  --color-on-surface: #ffffff;
  --color-on-background: #ffffff;
  --color-outline: #bdbdbd;
  --color-divider: #333333;
}
```

### Usage in Components

```vue
<template>
  <v-btn color="primary">Primary</v-btn>
  <v-btn color="secondary">Secondary</v-btn>
  <v-btn color="error">Error</v-btn>
  <v-btn color="success">Success</v-btn>
  
  <!-- Custom color via class -->
  <v-btn class="bg-custom-color">Custom</v-btn>
</template>

<style scoped>
.bg-custom-color {
  background-color: var(--color-primary-dark) !important;
  color: var(--color-primary-contrast) !important;
}
</style>
```

---

## Typography

### Font Families

```css
/* shared/styles/variables.scss */
$font-family-base: 'Inter', 'Roboto', 'Helvetica Neue', sans-serif;
$font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale

| Style | Size | Weight | Line Height | Usage |
| --- | --- | --- | --- | --- |
| Display Large | 57px | 400 | 64px | Hero headlines |
| Display Medium | 45px | 400 | 52px | Page titles |
| Display Small | 36px | 400 | 44px | Section headers |
| Headline Large | 32px | 400 | 40px | Card titles |
| Headline Medium | 28px | 400 | 36px | Sub-section |
| Headline Small | 24px | 400 | 32px | Card subtitles |
| Title Large | 22px | 500 | 28px | List items |
| Title Medium | 16px | 500 | 24px | Button text |
| Title Small | 14px | 500 | 20px | Captions |
| Body Large | 16px | 400 | 24px | Body text |
| Body Medium | 14px | 400 | 20px | Secondary text |
| Body Small | 12px | 400 | 16px | Fine print |
| Label Large | 14px | 500 | 20px | Form labels |
| Label Medium | 12px | 500 | 16px | Chip text |
| Label Small | 11px | 500 | 16px | Overline |

### Usage

```vue
<template>
  <h1 class="text-h1">Display Large</h1>
  <h2 class="text-h2">Display Medium</h2>
  <h3 class="text-h3">Display Small</h3>
  <h4 class="text-h4">Headline Large</h4>
  <h5 class="text-h5">Headline Medium</h5>
  <h6 class="text-h6">Headline Small</h6>
  
  <p class="text-body-1">Body Large</p>
  <p class="text-body-2">Body Medium</p>
  <span class="text-caption">Caption</span>
  <span class="text-overline">Overline</span>
</template>
```

---

## Spacing

### Spacing Scale

```css
/* CSS Variables */
:root {
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}
```

### Vuetify Spacing Classes

```vue
<template>
  <!-- Margin -->
  <div class="ma-4">Margin all 16px</div>
  <div class="mx-2">Margin horizontal 8px</div>
  <div class="mt-3">Margin top 12px</div>
  <div class="mb-6">Margin bottom 24px</div>

  <!-- Padding -->
  <div class="pa-4">Padding all 16px</div>
  <div class="px-2 py-3">Padding horizontal 8px, vertical 12px</div>
  
  <!-- Gap (flex/grid) -->
  <div class="d-flex gap-4">
    <div>Item 1</div>
    <div>Item 2</div>
  </div>
</template>
```

---

## Border Radius

```css
:root {
  --radius-none: 0;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;
}
```

### Vuetify Classes

```vue
<template>
  <v-card rounded="sm">Small radius (4px)</v-card>
  <v-card rounded="md">Medium radius (8px)</v-card>
  <v-card rounded="lg">Large radius (12px)</v-card>
  <v-card rounded="xl">Extra large (16px)</v-card>
  <v-card rounded="pill">Pill (full)</v-card>
</template>
```

---

## Shadows

```css
:root {
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04);
}
```

### Vuetify Elevation

```vue
<template>
  <v-card elevation="0">No shadow</v-card>
  <v-card elevation="1">Subtle</v-card>
  <v-card elevation="2">Low</v-card>
  <v-card elevation="4">Medium</v-card>
  <v-card elevation="8">High</v-card>
  <v-card elevation="16">Very high</v-card>
  <v-card elevation="24">Maximum</v-card>
</template>
```

---

## Breakpoints

```css
/* Vuetify Breakpoints */
$grid-breakpoints: (
  xs: 0,
  sm: 600px,
  md: 960px,
  lg: 1280px,
  xl: 1920px,
  xxl: 2560px,
);
```

### Responsive Classes

```vue
<template>
  <!-- Grid -->
  <v-row>
    <v-col cols="12" sm="6" md="4" lg="3">Column</v-col>
  </v-row>

  <!-- Display -->
  <div class="d-none d-sm-block">Hidden on xs</div>
  <div class="d-block d-md-none">Visible only on xs-sm</div>

  <!-- Text alignment -->
  <div class="text-center text-md-start">Center on mobile, left on desktop</div>

  <!-- Spacing responsive -->
  <div class="px-2 px-md-4 px-lg-6">Responsive padding</div>
</template>
```

---

## Components

### Buttons

```vue
<template>
  <!-- Variants -->
  <v-btn variant="tonal" color="primary">Tonal</v-btn>
  <v-btn variant="outlined" color="primary">Outlined</v-btn>
  <v-btn variant="text" color="primary">Text</v-btn>
  <v-btn variant="plain" color="primary">Plain</v-btn>

  <!-- States -->
  <v-btn disabled>Disabled</v-btn>
  <v-btn loading>Loading</v-btn>

  <!-- Sizes -->
  <v-btn size="x-small">XS</v-btn>
  <v-btn size="small">Small</v-btn>
  <v-btn size="default">Default</v-btn>
  <v-btn size="large">Large</v-btn>
  <v-btn size="x-large">XL</v-btn>

  <!-- Icons -->
  <v-btn icon><v-icon>mdi-plus</v-icon></v-btn>
  <v-btn start-icon="mdi-plus">With Icon</v-btn>
  <v-btn end-icon="mdi-arrow-right">With Icon</v-btn>
</template>
```

### Form Inputs

```vue
<template>
  <v-text-field
    label="Email"
    type="email"
    variant="outlined"
    density="compact"
    :error-messages="errors.email"
    required
  />

  <v-textarea
    label="Description"
    variant="outlined"
    rows="3"
    auto-grow
  />

  <v-select
    label="Status"
    :items="['todo', 'in_progress', 'done']"
    variant="outlined"
  />

  <v-date-picker
    v-model="date"
    :no-title="true"
    locale="en"
  />

  <v-file-input
    label="Avatar"
    accept="image/*"
    :max-size="2048"
    show-size
  />
</template>
```

### Cards

```vue
<template>
  <v-card variant="tonal" elevation="2">
    <v-card-title>Title</v-card-title>
    <v-card-text>Content</v-card-text>
    <v-card-actions>
      <v-btn variant="text">Action</v-btn>
    </v-card-actions>
  </v-card>

  <v-card variant="outlined">
    <v-card-item>
      <v-card-title>Outlined Card</v-card-title>
    </v-card-item>
  </v-card>

  <v-sheet variant="tonal" elevation="2" class="pa-4">
    Custom sheet
  </v-sheet>
</template>
```

### Tables

```vue
<template>
  <v-data-table
    :items="items"
    :headers="headers"
    :items-per-page="20"
    :page.sync="page"
    :sort-by.sync="sortBy"
    :sort-desc.sync="sortDesc"
    :loading="loading"
    item-key="id"
    class="elevation-1"
  >
    <template #[`item.status`]="{ item }">
      <v-chip :color="statusColor(item.status)" size="small">
        {{ statusLabel(item.status) }}
      </v-chip>
    </template>
    <template #[`item.actions`]="{ item }">
      <v-btn size="x-small" variant="text" @click="emit('edit', item)">Edit</v-btn>
      <v-btn size="x-small" variant="text" color="error" @click="emit('delete', item.id)">Delete</v-btn>
    </template>
  </v-data-table>
</template>
```

### Chips

```vue
<template>
  <v-chip color="primary" label>Primary</v-chip>
  <v-chip color="success" label>Success</v-chip>
  <v-chip color="error" label>Error</v-chip>
  <v-chip color="warning" label>Warning</v-chip>
  
  <!-- Status chips -->
  <v-chip :color="statusColor(status)" size="small" label>
    {{ statusLabel(status) }}
  </v-chip>

  <!-- Filter chips -->
  <v-chip-group v-model="selectedFilters" filter multiple>
    <v-chip filter value="todo">Todo</v-chip>
    <v-chip filter value="in_progress">In Progress</v-chip>
    <v-chip filter value="done">Done</v-chip>
  </v-chip-group>
</template>

<script setup>
const statusColor = (status: string) => {
  const colors = { todo: 'surface-variant', in_progress: 'primary', done: 'success' }
  return colors[status] || 'surface-variant'
}
const statusLabel = (status: string) => {
  const labels = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
  return labels[status] || status
}
</script>
```

### Dialogs & Modals

```vue
<template>
  <v-dialog v-model="open" max-width="600" persistent>
    <v-card>
      <v-card-title>Confirm Delete</v-card-title>
      <v-card-text>Are you sure you want to delete this task?</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">Cancel</v-btn>
        <v-btn color="error" @click="confirmDelete">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
```

### Lists

```vue
<template>
  <v-list lines="two" density="compact">
    <v-list-item v-for="item in items" :key="item.id" @click="select(item)">
      <v-list-item-title>{{ item.title }}</v-list-item-title>
      <v-list-item-subtitle>{{ item.description }}</v-list-item-subtitle>
    </v-list-item>
  </v-list>

  <v-list-item>
    <v-list-item-prepend>
      <v-avatar>
        <v-icon>mdi-account</v-icon>
      </v-avatar>
    </v-list-item-prepend>
    <v-list-item-title>John Doe</v-list-item-title>
    <v-list-item-subtitle>john@example.com</v-list-item-subtitle>
    <v-list-item-append>
      <v-chip size="small" color="primary">Admin</v-chip>
    </v-list-item-append>
  </v-list-item>
</template>
```

---

## Icons

```vue
<template>
  <!-- Vuetify icons (MDI) -->
  <v-icon>mdi-home</v-icon>
  <v-icon>mdi-account</v-icon>
  <v-icon>mdi-settings</v-icon>

  <!-- Tabler icons -->
  <v-icon>tabler-home</v-icon>
  <v-icon>tabler-user</v-icon>

  <!-- Custom size -->
  <v-icon size="24">mdi-home</v-icon>
  <v-icon size="x-large">mdi-home</v-icon>

  <!-- Colored -->
  <v-icon color="primary">mdi-check</v-icon>
  <v-icon color="error">mdi-close</v-icon>
</template>
```

---

## Animations

```css
/* Custom transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-y-enter-active,
.slide-y-leave-active {
  transition: transform 0.3s ease, opacity 0.2s ease;
}
.slide-y-enter-from,
.slide-y-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.scale-enter-from,
.scale-leave-to {
  transform: scale(0.95);
  opacity: 0;
}
```

```vue
<template>
  <transition name="fade">
    <div v-if="show">Content</div>
  </transition>

  <transition name="slide-y">
    <div v-if="show">Dropdown</div>
  </transition>

  <transition name="scale">
    <v-dialog v-model="open">...</v-dialog>
  </transition>
</template>
```

---

## Accessibility

### Semantic HTML

```vue
<template>
  <main role="main">
    <header role="banner">
      <nav role="navigation" aria-label="Main navigation">...</nav>
    </header>
    <section aria-labelledby="tasks-heading">
      <h2 id="tasks-heading">Tasks</h2>
      ...
    </section>
  </main>
</template>
```

### ARIA Attributes

```vue
<template>
  <v-btn
    aria-label="Delete task"
    aria-describedby="delete-desc"
    @click="deleteTask"
  >
    <v-icon>mdi-delete</v-icon>
  </v-btn>
  <span id="delete-desc" class="sr-only">Delete this task permanently</span>

  <v-text-field
    aria-label="Search tasks"
    aria-describedby="search-hint"
  />
  <span id="search-hint" class="sr-only">Type to filter tasks by title</span>

  <v-dialog v-model="open" aria-modal="true" aria-labelledby="dialog-title">
    <v-card>
      <v-card-title id="dialog-title">Confirm</v-card-title>
      ...
    </v-card>
  </v-dialog>
</template>
```

### Focus Management

```vue
<script setup>
import { ref, onMounted, watch } from 'vue'

const dialog = ref(false)
const firstFocusable = ref<HTMLElement>()

watch(dialog, (open) => {
  if (open) {
    nextTick(() => {
      firstFocusable.value?.focus()
    })
  }
})
</script>

<template>
  <v-dialog v-model="dialog" trap-focus>
    <v-card>
      <v-card-title>Dialog</v-card-title>
      <v-text-field ref="firstFocusable" label="Focus me first" />
    </v-card>
  </v-dialog>
</template>
```

---

## Dark Mode

```vue
<script setup>
import { useTheme } from 'vuetify'

const theme = useTheme()

function toggleTheme() {
  theme.global.name.value = theme.global.name.value === 'light' ? 'dark' : 'light'
}
</script>

<template>
  <v-btn @click="toggleTheme" variant="tonal">
    <v-icon>{{ theme.global.current.value.dark ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
    <span class="d-none d-sm-inline">{{ theme.global.current.value.dark ? 'Light' : 'Dark' }}</span>
  </v-btn>
</template>
```

---

## Responsive Design

```vue
<template>
  <!-- Mobile-first -->
  <v-container fluid>
    <v-row>
      <v-col cols="12" sm="6" md="4" lg="3">
        <TaskCard />
      </v-col>
    </v-row>
  </v-container>

  <!-- Hide on mobile -->
  <v-btn class="d-none d-sm-block">Desktop only</v-btn>
  
  <!-- Show on mobile only -->
  <v-btn class="d-block d-sm-none">Mobile only</v-btn>
</template>
```

---

## Print Styles

```css
@media print {
  .no-print {
    display: none !important;
  }
  
  .print-break-before {
    page-break-before: always;
  }
  
  .print-break-after {
    page-break-after: always;
  }
  
  .print-break-inside-avoid {
    page-break-inside: avoid;
  }
}
```

```vue
<template>
  <div class="no-print">
    <v-btn @click="print">Print</v-btn>
  </div>
  
  <div class="print-break-inside-avoid">
    <TaskCard v-for="task in tasks" :key="task.id" :task="task" />
  </div>
</template>
```