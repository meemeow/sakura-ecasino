import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

// App-wide PrimeVue theme. Change brand colors here, not in components.
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
    // Keyboard focus rings follow the theme (--app-focus in main.css): gold on dark, pink on white
    focusRing: {
      color: 'var(--app-focus)',
    },
    // Per theme: focused inputs and selects outline in the same focus color, and dark mode gets
    // blue-tinted surfaces (dialogs, inputs, menus) to match the navy app background
    colorScheme: {
      light: {
        formField: {
          focusBorderColor: 'var(--app-focus)',
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
    // Buttons ring in the theme focus color (they carry their own, gold by default). Text buttons
    // (the header's menu button) get a sakura pink wash on hover/press in light mode instead of
    // the pale amber one; dark mode keeps the gold.
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
