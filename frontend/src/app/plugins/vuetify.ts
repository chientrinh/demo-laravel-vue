import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import '@/shared/styles/main.scss'

import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { en } from 'vuetify/locale'

export default createVuetify({
  locale: {
    locale: 'en',
    messages: { en },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#6C31DE',
          'primary-darken-1': '#5602C9',
          secondary: '#5B5F64',
          'secondary-darken-1': '#44474C',
          accent: '#007BB5',
          error: '#BA1A1A',
          info: '#16B1FF',
          success: '#2E7D32',
          warning: '#ED6C02',
          background: '#F8F5FC',
          surface: '#FFFFFF',
          'surface-variant': '#E9DDFF',
          'on-surface-variant': '#49454F',
          'on-background': '#1D1B20',
          'on-surface': '#1D1B20',
        },
        variables: {
          'border-color': '#E7E0EC',
          'border-radius-root': '12px',
          'font-family': 'Inter, Public Sans, Roboto, sans-serif',
          'high-emphasis-opacity': 0.87,
          'medium-emphasis-opacity': 0.62,
          'disabled-opacity': 0.4,
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'lg', elevation: 0 },
    VCard: { rounded: 'xl', elevation: 0 },
    VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VSelect: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VTextarea: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VChip: { rounded: 'lg' },
    VDialog: { maxWidth: 620 },
  },
})
