import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

export const SakuraPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{amber.50}',
      100: '{amber.100}',
      200: '{amber.200}',
      300: '{amber.300}',
      400: '{amber.400}',
      500: '{amber.500}',
      600: '{amber.600}',
      700: '{amber.700}',
      800: '{amber.800}',
      900: '{amber.900}',
      950: '{amber.950}',
    },
    focusRing: {
      color: 'var(--app-focus)',
    },
    colorScheme: {
      light: {
        formField: {
          focusBorderColor: 'var(--app-focus)',
        },
        highlight: {
          background: '#ffe9f1',
          focusBackground: '#ffd6e5',
          color: '#c2306a',
          focusColor: '#a8285b',
        },
      },
      dark: {
        formField: {
          focusBorderColor: 'var(--app-focus)',
        },
        surface: {
          0: '#ffffff',
          50: '{slate.50}',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',
          900: '{slate.900}',
          950: '{slate.950}',
        },
      },
    },
  },
  components: {
    button: {
      colorScheme: {
        dark: {
          root: {
            primary: { focusRing: { color: 'var(--app-focus)' } },
          },
        },
        light: {
          root: {
            primary: { focusRing: { color: 'var(--app-focus)' } },
          },
          text: {
            primary: {
              hoverBackground: '#ffe9f1',
              activeBackground: '#ffd6e5',
              color: '#e0457f',
            },
          },
        },
      },
    },
  },
})
