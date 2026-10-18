<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import DialogBand from '@/components/layout/DialogBand.vue'
import PencilIcon from '@/components/account/PencilIcon.vue'
import { updateDisplayName } from '@/services/profile'

const MAX_LENGTH = 20
// Firestore keeps retrying offline writes forever; stop waiting after this long
const SAVE_TIMEOUT_MS = 10_000

const visible = defineModel<boolean>('visible', { required: true })
const props = defineProps<{ uid: string; currentName: string }>()

const toast = useToast()
const name = ref('')
const error = ref('')
const saving = ref(false)
const inputWrap = ref<HTMLElement>()

watch(visible, (open) => {
  if (!open) return
  name.value = props.currentName
  error.value = ''
  nextTick(() => inputWrap.value?.querySelector('input')?.select())
})

async function save() {
  const value = name.value.trim()
  if (!value) return (error.value = 'Enter a username.')
  if (value.length > MAX_LENGTH) return (error.value = `Use ${MAX_LENGTH} characters or fewer.`)
  saving.value = true
  try {
    await Promise.race([
      updateDisplayName(props.uid, value),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), SAVE_TIMEOUT_MS)),
    ])
    visible.value = false
    toast.add({ severity: 'success', summary: 'Player tag updated', life: 2000 })
  } catch (e) {
    error.value =
      (e as Error).message === 'timeout'
        ? "Couldn't reach the server. Check your connection and try again."
        : 'Could not save. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    dismissable-mask
    :show-header="false"
    :draggable="false"
    class="sakura-edit-name"
  >
    <DialogBand
      small-tree
      title="Edit player tag"
      subtitle="Shown on your profile instead of your mobile number"
      @close="visible = false"
    >
      <template #icon><PencilIcon /></template>
    </DialogBand>

    <form class="edit-form" @submit.prevent="save">
      <div ref="inputWrap" class="edit-field">
        <FloatLabel variant="in">
          <InputText
            id="player-tag"
            v-model="name"
            :maxlength="MAX_LENGTH"
            autocomplete="nickname"
            fluid
            :invalid="!!error"
            @input="error = ''"
          />
          <label for="player-tag">Username</label>
        </FloatLabel>
        <span class="char-count" :class="{ full: name.length >= MAX_LENGTH }" aria-hidden="true">
          {{ name.length }}/{{ MAX_LENGTH }}
        </span>
      </div>
      <p v-if="error" class="edit-error">{{ error }}</p>
      <Button type="submit" label="Save Changes" class="edit-save" :loading="saving" />
    </form>
  </Dialog>
</template>

<!-- Not scoped: Dialog teleports to <body>, outside this component's scope -->
<style>
.p-dialog.sakura-edit-name {
  width: min(600px, calc(100vw - 32px));
  /* The header band (DialogBand) runs edge to edge; the form pads itself */
  padding: 0;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 16px;
  background: var(--app-navbar);
  font-family: 'Montserrat', sans-serif;
  /* Title, focus ring, focused label and required marks: gold here, sakura pink on white */
  --dlg-accent: #ffc200;
}

:root:not(.app-dark) .p-dialog.sakura-edit-name {
  --dlg-accent: #e0457f;
}

.sakura-edit-name .p-dialog-content {
  padding: 0;
  overflow: visible;
}

/* The page background under the navbar-colored band, like Personal Details */
.sakura-edit-name .edit-form {
  padding: 20px 28px 24px;
  background: var(--app-bg);
}

@media (max-width: 560px) {
  .sakura-edit-name .edit-form {
    padding-left: 18px;
    padding-right: 18px;
  }
}

.sakura-edit-name .p-inputtext {
  height: 52px;
  border: 1.5px solid #2a3045;
  border-radius: 10px;
  background: var(--app-surface);
  color: var(--app-text);
  font-family: inherit;
  font-weight: 500;
  font-size: 1rem;
  box-shadow: none;
}

/* Character count inside the field's right edge; the input pads its text clear of it */
.sakura-edit-name .edit-field {
  position: relative;
}

.sakura-edit-name .edit-field .p-inputtext {
  padding-right: 64px;
}

.sakura-edit-name .char-count {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.sakura-edit-name .char-count.full {
  color: var(--dlg-accent);
}

.sakura-edit-name .p-inputtext:enabled:focus {
  border-color: var(--dlg-accent);
}

.sakura-edit-name .p-inputtext.p-invalid {
  border-color: #f87171;
}

/* Floating label ("in" variant): shrinks to the top inside the field, plain text, no fill */
.sakura-edit-name .p-floatlabel label {
  color: var(--app-muted);
  font-family: inherit;
}

.sakura-edit-name .p-floatlabel:has(input:focus) label,
.sakura-edit-name .p-floatlabel:has(input.p-filled) label {
  color: var(--app-muted);
}

.sakura-edit-name .p-floatlabel:has(input:focus) label {
  color: var(--dlg-accent);
}

.sakura-edit-name .edit-error {
  margin: 8px 0 0;
  color: #f87171;
  font-weight: 500;
  font-size: 0.85rem;
}

/* 3D button in the Log out dialog's colors (LogoutDialog.vue): lavender in dark mode,
   navy in light mode */
.sakura-edit-name .edit-save {
  width: 100%;
  margin-top: 18px;
  margin-bottom: 4px;
  padding: 11px;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.8rem;
  text-transform: uppercase;
  transition:
    filter 0.2s,
    transform 0.1s;
}

.sakura-edit-name .edit-save .p-button-label {
  font-weight: 900;
}

/* PrimeVue's own hover and pressed states paint the primary (amber) colors, so each theme's
   colors are restated for them */
.app-dark .sakura-edit-name .edit-save,
.app-dark .sakura-edit-name .edit-save:not(:disabled):hover,
.app-dark .sakura-edit-name .edit-save:not(:disabled):active {
  border: none;
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 4px 0 #8f9bd1;
  color: #1b2550;
}

:root:not(.app-dark) .sakura-edit-name .edit-save,
:root:not(.app-dark) .sakura-edit-name .edit-save:not(:disabled):hover,
:root:not(.app-dark) .sakura-edit-name .edit-save:not(:disabled):active {
  border: none;
  background: linear-gradient(#34418a, #1b2550 55%, #131b3d);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 4px 0 #0b1029;
  color: #ffffff;
}

.sakura-edit-name .edit-save:not(:disabled):hover {
  filter: brightness(1.06);
}

.sakura-edit-name .edit-save:not(:disabled):active {
  transform: translateY(2px);
}

/* Disabled (declarations not ticked yet): flat and faded */
.sakura-edit-name .edit-save:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
