<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import DatePicker from 'primevue/datepicker'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { REQUIRED_DETAILS, updatePersonalDetails } from '@/services/profile'
import type { PersonalDetails, UserProfile } from '@/types'
import countries from './countries.json'
import nationalities from './nationalities.json'
import DialogBand from '@/components/layout/DialogBand.vue'

// Players must be 21+ (PAGCOR)
const MIN_AGE = 21
// The calendar pages between these; picking is further limited to 21+ (see datePickerPt)
const MIN_BIRTHDATE = new Date(1900, 0, 1)
const MAX_PAGE_DATE = new Date(2099, 11, 31)
// Firestore keeps retrying offline writes forever; stop waiting after this long
const SAVE_TIMEOUT_MS = 10_000

const SOURCES_OF_INCOME = [
  'Salary',
  'Business',
  'Savings',
  'Investments',
  'Remittance',
  'Pension',
  'Allowance',
  'Others',
]

const OCCUPATIONS = [
  'Accounting / Finance',
  'Administrative / Clerical',
  'Agriculture / Fishing',
  'Arts / Media / Entertainment',
  'BPO / Call Center',
  'Business Owner / Self-Employed',
  'Construction / Skilled Trades',
  'Education / Teaching',
  'Engineering',
  'Freelancer',
  'Government Employee',
  'Healthcare / Medical',
  'Hospitality / Food Service',
  'Information Technology',
  'Legal',
  'Manufacturing / Production',
  'Military / Police',
  'OFW / Seafarer',
  'Real Estate',
  'Retail / Sales',
  'Transportation / Logistics',
  'Homemaker',
  'Student',
  'Retired',
  'Unemployed',
  'Others',
]

type Field = keyof PersonalDetails
// Identity fields can't be changed once saved (enforced in firestore.rules)
const LOCKED_ONCE_SET: Field[] = ['firstName', 'middleName', 'lastName', 'birthdate', 'nationality']
const visible = defineModel<boolean>('visible', { required: true })
const props = defineProps<{
  uid: string
  profile: UserProfile | null | undefined
  mobile: string
}>()
const emit = defineEmits<{ saved: [] }>()

const toast = useToast()

const emptyForm = (): PersonalDetails => ({
  firstName: '',
  lastName: '',
  birthdate: '',
  nationality: '',
  middleName: '',
  placeOfBirth: '',
  email: '',
  occupation: '',
  sourceOfIncome: '',
  permanentAddress: '',
  currentAddress: '',
  sameAsPermanent: false,
})

const form = reactive(emptyForm())
// DatePicker works with Date; Firestore stores 'YYYY-MM-DD' to avoid timezone shifts
const birthdate = ref<Date | null>(null)
const invalid = ref(new Set<Field>())
const error = ref('')
const saving = ref(false)
// Declarations: re-confirmed on every save, since each save can change the details.
// Once an admin has approved the account they stay ticked and locked: the player already
// agreed, and the save still records them again (consentedAt).
const agreePrivacy = ref(false)
const agreeTruthful = ref(false)
const consentMissing = ref(false)
const isVerified = computed(() => !!props.profile?.verifiedAt)

// Today's calendar date in the Philippines, whatever the device's time zone
function todayInManila() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  return { y: get('year'), m: get('month'), d: get('day') }
}

// Latest birthdate that is 21 today in PH time. Same rule as validBirthdate in firestore.rules.
const maxBirthdate = computed(() => {
  const { y, m, d } = todayInManila()
  return new Date(y - MIN_AGE, m - 1, d)
})

// Most players are Filipino, so the Philippine option goes first. A value saved before the
// list existed (free text) is kept as an option so the field still shows it.
function pickerOptions(list: string[], first: string, saved: string | undefined) {
  const options = [first, ...list.filter((v) => v !== first)]
  return saved && !options.includes(saved) ? [saved, ...options] : options
}
const nationalityOptions = computed(() =>
  pickerOptions(nationalities, 'Filipino', props.profile?.nationality),
)
const countryOptions = computed(() =>
  pickerOptions(countries, 'Philippines', props.profile?.placeOfBirth),
)
const occupationOptions = computed(() => {
  const saved = props.profile?.occupation
  return saved && !OCCUPATIONS.includes(saved) ? [saved, ...OCCUPATIONS] : OCCUPATIONS
})

// The calendar pages from 1900 to 2099 (min/max-date), but only dates that make the player 21+
// can be picked. PrimeVue's max-date would also stop the paging, so the cells past the cutoff
// are disabled here instead: faded, and their click and Enter/Space swallowed before PrimeVue's
// own handlers run (capture phase).
function blockPick(e: Event) {
  if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  e.stopImmediatePropagation()
}
const tooRecent = (after: boolean) =>
  after
    ? {
        class: 'p-disabled',
        'aria-disabled': true,
        onClickCapture: blockPick,
        onKeydownCapture: blockPick,
      }
    : {}

interface PtState {
  state: { currentYear: number; currentMonth: number; currentView: string }
}

// PrimeVue's arrows ignore min/max-date and page on forever (the year grid reached 1890-1899),
// so each arrow is disabled at the paging limits for the current view
const MIN_YEAR = MIN_BIRTHDATE.getFullYear()
const MAX_YEAR = MAX_PAGE_DATE.getFullYear()
function atStart({ currentView, currentYear, currentMonth }: PtState['state']) {
  if (currentView === 'year') return currentYear - (currentYear % 10) <= MIN_YEAR
  if (currentView === 'month') return currentYear <= MIN_YEAR
  return currentYear < MIN_YEAR || (currentYear === MIN_YEAR && currentMonth === 0)
}
function atEnd({ currentView, currentYear, currentMonth }: PtState['state']) {
  if (currentView === 'year') return currentYear - (currentYear % 10) + 9 >= MAX_YEAR
  if (currentView === 'month') return currentYear >= MAX_YEAR
  return currentYear > MAX_YEAR || (currentYear === MAX_YEAR && currentMonth === 11)
}
// The arrows are PrimeVue Buttons, so their pt goes through `root`
const navLimit = (stop: boolean) => ({
  root: stop ? { disabled: true, onClickCapture: blockPick, onKeydownCapture: blockPick } : {},
})

const datePickerPt = {
  pcPrevButton: ({ state }: PtState) => navLimit(atStart(state)),
  pcNextButton: ({ state }: PtState) => navLimit(atEnd(state)),
  // One "May 2004" title that steps back to the month grid, instead of separate month and year
  // buttons that jump to different views. The year rides on the month button for the CSS to show.
  selectMonth: ({ state }: PtState) => ({ 'data-year': state.currentYear }),
  day: ({ context }: { context: { date: { year: number; month: number; day: number } } }) => {
    const { year, month, day } = context.date
    return tooRecent(new Date(year, month, day) > maxBirthdate.value)
  },
  month: ({ state, context }: PtState & { context: { monthIndex: number } }) =>
    tooRecent(new Date(state.currentYear, context.monthIndex, 1) > maxBirthdate.value),
  year: ({ context }: { context: { year: { value: number } } }) =>
    tooRecent(context.year.value > maxBirthdate.value.getFullYear()),
}

// With no birthdate yet, open the calendar on the year grid at the 21+ cutoff: year, then month,
// then day is far quicker than paging month by month. Without a value PrimeVue would open on
// today, which is all disabled. currentView/currentYear/currentMonth are DatePicker internal
// state (PrimeVue 4).
const birthdatePicker = ref<{
  currentView: string
  currentYear: number
  currentMonth: number
} | null>(null)
function openOnYears() {
  const picker = birthdatePicker.value
  if (birthdate.value || !picker) return
  picker.currentYear = maxBirthdate.value.getFullYear()
  picker.currentMonth = maxBirthdate.value.getMonth()
  picker.currentView = 'year'
}

const isLocked = (field: Field) => LOCKED_ONCE_SET.includes(field) && !!props.profile?.[field]
// Nothing saved yet: the dialog reads as sign-up rather than editing
const isFirstTime = computed(() => !props.profile?.firstName)
const title = computed(() =>
  isFirstTime.value ? "SAKURA's Player Registration" : "SAKURA's Player Details",
)

// Immediate: the account page can mount this already open (profile completion redirect)
watch(
  visible,
  (open) => {
    if (!open) return
    Object.assign(form, emptyForm(), pickDetails(props.profile))
    birthdate.value = fromIsoDate(form.birthdate)
    invalid.value = new Set()
    error.value = ''
    agreePrivacy.value = isVerified.value
    agreeTruthful.value = isVerified.value
    consentMissing.value = false
  },
  { immediate: true },
)

// Keep the current address mirrored while the box is ticked
watch(
  () => [form.sameAsPermanent, form.permanentAddress] as const,
  ([same, permanent]) => {
    if (same) form.currentAddress = permanent
  },
)

function pickDetails(profile: UserProfile | null | undefined): Partial<PersonalDetails> {
  if (!profile) return {}
  const keys = Object.keys(emptyForm()) as Field[]
  return Object.fromEntries(keys.filter((k) => profile[k] != null).map((k) => [k, profile[k]]))
}

function toIsoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fromIsoDate(iso: string) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d)
}

function clearError(field: Field) {
  invalid.value.delete(field)
  error.value = ''
}

function validate() {
  const bad = new Set<Field>(REQUIRED_DETAILS.filter((f) => !String(form[f]).trim()))
  if (bad.size) {
    invalid.value = bad
    return 'Please fill in all required fields.'
  }
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    invalid.value = new Set(['email'])
    return 'Enter a valid email address.'
  }
  if (birthdate.value && birthdate.value < MIN_BIRTHDATE) {
    invalid.value = new Set(['birthdate'])
    return 'Enter a valid birthdate.'
  }
  if (birthdate.value && birthdate.value > maxBirthdate.value) {
    invalid.value = new Set(['birthdate'])
    return `You must be at least ${MIN_AGE} years old.`
  }
  if (!agreePrivacy.value || !agreeTruthful.value) {
    consentMissing.value = true
    return 'Please tick both declarations to continue.'
  }
  return ''
}

function clearConsentError() {
  consentMissing.value = false
  error.value = ''
}

async function save() {
  form.birthdate = birthdate.value ? toIsoDate(birthdate.value) : ''
  error.value = validate()
  if (error.value) return

  const details = Object.fromEntries(
    Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
  ) as unknown as PersonalDetails
  saving.value = true
  try {
    await Promise.race([
      updatePersonalDetails(props.uid, details),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), SAVE_TIMEOUT_MS)),
    ])
    visible.value = false
    toast.add({ severity: 'success', summary: 'Personal details saved', life: 2000 })
    emit('saved')
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
  <!-- Shares the form styles in EditNameDialog (.sakura-edit-name) -->
  <Dialog
    v-model:visible="visible"
    modal
    dismissable-mask
    :show-header="false"
    :draggable="false"
    class="sakura-edit-name sakura-details"
  >
    <DialogBand :title="title" subtitle="Used to verify your account" @close="visible = false">
      <template #icon><i class="pi pi-id-card" /></template>
    </DialogBand>

    <form class="details-form" novalidate @submit.prevent="save">
      <div class="details-body">
        <div class="details-grid">
          <!-- Sections side by side to use the width, so the whole form fits without scrolling.
           Each has a small uppercase heading. -->
          <section class="group group-identity full">
            <div class="group-head">
              <h3>Identity</h3>
              <span class="group-hint"><i class="pi pi-lock" /> Locked once saved</span>
            </div>
            <FloatLabel variant="in">
              <InputText
                id="pd-first"
                maxlength="60"
                v-model="form.firstName"
                autocomplete="given-name"
                fluid
                :disabled="isLocked('firstName')"
                :invalid="invalid.has('firstName')"
                @input="clearError('firstName')"
              />
              <label for="pd-first">First Name<sup>*</sup></label>
            </FloatLabel>

            <FloatLabel variant="in">
              <InputText
                id="pd-middle"
                maxlength="60"
                v-model="form.middleName"
                autocomplete="additional-name"
                fluid
                :disabled="isLocked('middleName')"
              />
              <label for="pd-middle">Middle Name</label>
            </FloatLabel>

            <FloatLabel variant="in">
              <InputText
                id="pd-last"
                maxlength="60"
                v-model="form.lastName"
                autocomplete="family-name"
                fluid
                :disabled="isLocked('lastName')"
                :invalid="invalid.has('lastName')"
                @input="clearError('lastName')"
              />
              <label for="pd-last">Last Name<sup>*</sup></label>
            </FloatLabel>

            <FloatLabel variant="in">
              <DatePicker
                ref="birthdatePicker"
                v-model="birthdate"
                input-id="pd-birthdate"
                date-format="mm/dd/yy"
                :min-date="MIN_BIRTHDATE"
                :max-date="MAX_PAGE_DATE"
                :show-other-months="false"
                panel-class="sakura-datepicker"
                :pt="datePickerPt"
                show-icon
                icon-display="input"
                fluid
                :disabled="isLocked('birthdate')"
                :invalid="invalid.has('birthdate')"
                @show="openOnYears"
                @update:model-value="clearError('birthdate')"
              />
              <label for="pd-birthdate">Birthdate<sup>*</sup></label>
            </FloatLabel>

            <FloatLabel variant="in">
              <Select
                v-model="form.nationality"
                input-id="pd-nationality"
                :options="nationalityOptions"
                filter
                auto-filter-focus
                fluid
                :disabled="isLocked('nationality')"
                :invalid="invalid.has('nationality')"
                @change="clearError('nationality')"
              />
              <label for="pd-nationality">Nationality<sup>*</sup></label>
            </FloatLabel>

            <FloatLabel variant="in">
              <Select
                v-model="form.placeOfBirth"
                input-id="pd-pob"
                :options="countryOptions"
                filter
                auto-filter-focus
                fluid
              />
              <label for="pd-pob">Place of Birth</label>
            </FloatLabel>
          </section>

          <section class="group">
            <div class="group-head">
              <h3>Contact</h3>
            </div>
            <FloatLabel variant="in">
              <InputText id="pd-mobile" :model-value="mobile" fluid disabled />
              <label for="pd-mobile">Mobile Number</label>
            </FloatLabel>

            <FloatLabel variant="in">
              <InputText
                id="pd-email"
                maxlength="254"
                v-model="form.email"
                type="email"
                autocomplete="email"
                fluid
                :invalid="invalid.has('email')"
                @input="clearError('email')"
              />
              <label for="pd-email">Email<sup>*</sup></label>
            </FloatLabel>
          </section>

          <section class="group">
            <div class="group-head">
              <h3>Work &amp; Income</h3>
            </div>
            <FloatLabel variant="in">
              <Select
                v-model="form.occupation"
                input-id="pd-occupation"
                :options="occupationOptions"
                filter
                auto-filter-focus
                fluid
                :invalid="invalid.has('occupation')"
                @change="clearError('occupation')"
              />
              <label for="pd-occupation">Occupation<sup>*</sup></label>
            </FloatLabel>

            <FloatLabel variant="in">
              <Select
                v-model="form.sourceOfIncome"
                input-id="pd-income"
                :options="SOURCES_OF_INCOME"
                fluid
                :invalid="invalid.has('sourceOfIncome')"
                @change="clearError('sourceOfIncome')"
              />
              <label for="pd-income">Source of Income<sup>*</sup></label>
            </FloatLabel>
          </section>

          <section class="group full">
            <div class="group-head">
              <h3>Address</h3>
              <label class="same-address">
                <Checkbox
                  v-model="form.sameAsPermanent"
                  binary
                  @change="clearError('currentAddress')"
                />
                Same as permanent address
              </label>
            </div>
            <FloatLabel variant="in">
              <InputText
                id="pd-permanent"
                maxlength="250"
                v-model="form.permanentAddress"
                autocomplete="street-address"
                fluid
                :invalid="invalid.has('permanentAddress')"
                @input="clearError('permanentAddress')"
              />
              <label for="pd-permanent">Permanent Address<sup>*</sup></label>
            </FloatLabel>

            <FloatLabel variant="in">
              <InputText
                id="pd-current"
                maxlength="250"
                v-model="form.currentAddress"
                fluid
                :disabled="form.sameAsPermanent"
                :invalid="invalid.has('currentAddress')"
                @input="clearError('currentAddress')"
              />
              <label for="pd-current">Current Address<sup>*</sup></label>
            </FloatLabel>
          </section>

          <div class="declarations full">
            <label class="consent">
              <Checkbox
                v-model="agreePrivacy"
                binary
                :disabled="isVerified"
                :invalid="consentMissing && !agreePrivacy"
                @change="clearConsentError"
              />
              <span>
                I consent to Sakura storing the details above so the demo can work, as described in
                Sakura's Privacy Policy and in line with the Data Privacy Act of 2012
                (RA&nbsp;10173).<sup>*</sup>
              </span>
            </label>
            <label class="consent">
              <Checkbox
                v-model="agreeTruthful"
                binary
                :disabled="isVerified"
                :invalid="consentMissing && !agreeTruthful"
                @change="clearConsentError"
              />
              <span>
                I understand that Sakura is a play-money portfolio demo: dummy details are
                encouraged, and balances and winnings have no cash value.<sup>*</sup>
              </span>
            </label>
          </div>
        </div>
      </div>

      <footer class="details-foot">
        <span class="foot-icon"><i class="pi pi-shield" /></span>
        <div class="foot-text">
          <h3>Review &amp; Confirm</h3>
          <p v-if="error" class="foot-error" role="alert">{{ error }}</p>
          <p v-else-if="isVerified">Your account is verified. Your declarations stay on file.</p>
          <p v-else>Deposits and withdrawals unlock once your details are approved.</p>
        </div>
        <Button
          type="submit"
          label="Save Changes"
          class="edit-save"
          :loading="saving"
          :disabled="!agreePrivacy || !agreeTruthful"
        />
      </footer>
    </form>
  </Dialog>
</template>

<!-- Not scoped: Dialog teleports to <body>, outside this component's scope -->
<style>
/* Wide enough to lay sections side by side, so the form fits without scrolling */
/* Doubled class so it beats EditNameDialog's 600px width, which shares this dialog class */
.p-dialog.sakura-edit-name.sakura-details {
  width: min(920px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  padding: 0;
  overflow: hidden;
}

/* Header band and footer stay put; only the fields between them scroll on short screens */
.sakura-details .p-dialog-content,
.sakura-details .details-form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.sakura-details .details-body {
  flex: 1;
  min-height: 0;
  padding: 20px 28px;
  overflow-y: auto;
  /* The page background between the navbar-colored header and footer, like the app itself */
  background: var(--app-bg);
}

/* Footer: what happens next on the left, Save on the right */
.sakura-details .details-foot {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 14px;
  padding: 14px 28px 16px;
  border-top: 1px solid var(--app-border);
}

.sakura-details .foot-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgb(255 194 0 / 0.12);
  color: #ffc200;
}

:root:not(.app-dark) .sakura-details .foot-icon {
  background: #ffe9f1;
  color: #e0457f;
}

.sakura-details .foot-text {
  flex: 1;
  min-width: 0;
}

.sakura-details .foot-text h3 {
  margin: 0;
  color: var(--app-text);
  font-weight: 800;
  font-size: 0.95rem;
}

/* Light mode: the logo's navy instead of near-black */
:root:not(.app-dark) .sakura-details .foot-text h3,
:root:not(.app-dark) .sakura-details .group-head h3 {
  color: #1c2651;
}

.sakura-details .foot-text p {
  margin: 3px 0 0;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.8rem;
}

.sakura-details .foot-text .foot-error {
  color: #f87171;
}

.sakura-details .details-foot .edit-save {
  flex: 0 0 auto;
  width: auto;
  margin: 0 0 4px;
  padding: 11px 28px;
}

@media (max-width: 560px) {
  .sakura-details .details-body,
  .sakura-details .details-foot {
    padding-left: 18px;
    padding-right: 18px;
  }

  .sakura-details .details-foot {
    flex-wrap: wrap;
  }

  .sakura-details .details-foot .edit-save {
    width: 100%;
  }
}

/* Sections: Identity across the top, Contact | Work & Income, then Address across */
.sakura-details .details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
}

.sakura-details .full {
  grid-column: 1 / -1;
}

/* Each section is its own grid: its heading on top, then its fields two across */
.sakura-details .group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 12px;
}

.sakura-details .group-identity {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.sakura-details .group > .group-head,
.sakura-details .group > .full {
  grid-column: 1 / -1;
}

/* Tablets: sections stack, Identity drops to two across */
@media (max-width: 760px) {
  .sakura-details .details-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .sakura-details .group-identity {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Phones: one field per row */
@media (max-width: 560px) {
  .sakura-details .group,
  .sakura-details .group-identity {
    grid-template-columns: minmax(0, 1fr);
  }
}
/* Section headings: the name, with an optional hint on the right */
.sakura-details .group-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sakura-details .group-head h3 {
  flex: 1;
  margin: 0;
  color: var(--app-text);
  font-weight: 900;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.sakura-details .group-hint {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.7rem;
}

.sakura-details .group-hint .pi {
  font-size: 0.65rem;
}

/* Light mode: a soft grey field border instead of the dark one, which is harsh on white.
   Focus and error borders still win (they're more specific). */
:root:not(.app-dark) .sakura-edit-name .p-inputtext:not(:focus):not(.p-invalid),
:root:not(.app-dark) .sakura-details .p-select:not(.p-focus):not(.p-invalid) {
  border-color: #d5dbea;
}

.sakura-details .p-floatlabel label sup {
  margin-left: 1px;
  font-size: 0.7em;
}

/* Select and DatePicker get the same field look as InputText */
.sakura-details .p-select {
  height: 52px;
  border: 1.5px solid #2a3045;
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: none;
}

.sakura-details .p-select .p-select-label {
  display: flex;
  align-items: center;
  color: var(--app-text);
  font-family: inherit;
  font-weight: 500;
  font-size: 1rem;
}

/* Compact fields: shorter than EditNameDialog's 52px and a touch smaller text, with the
   floating label's padding tightened so the label and value still fit */
.sakura-details .p-floatlabel-in .p-inputtext,
.sakura-details .p-floatlabel-in .p-select {
  height: 44px;
}

.sakura-details .p-floatlabel-in .p-inputtext,
.sakura-details .p-floatlabel-in .p-select .p-select-label {
  padding-block: 1.2rem 0.3rem;
  font-size: 0.9rem;
}

.sakura-details .p-floatlabel-in label {
  font-size: 0.9rem;
}

.sakura-details .p-floatlabel-in:has(input:focus) label,
.sakura-details .p-floatlabel-in:has(input.p-filled) label,
.sakura-details .p-floatlabel-in:has(input:-webkit-autofill) label,
.sakura-details .p-floatlabel-in:has(.p-inputwrapper-focus) label,
.sakura-details .p-floatlabel-in:has(.p-inputwrapper-filled) label {
  top: 5px;
  font-size: 0.7rem;
}

.sakura-details .p-select.p-focus {
  border-color: var(--dlg-accent);
}

.sakura-details .p-select.p-invalid {
  border-color: #f87171;
}

.sakura-details .p-floatlabel:has(.p-inputwrapper-focus) label {
  color: var(--dlg-accent);
}

.sakura-details .p-datepicker-input-icon-container {
  color: var(--app-muted);
}

/* Locked fields: readable but clearly not editable. Dimmed text and border rather than opacity,
   so the fill still matches the floating label's background */
.sakura-details .p-inputtext:disabled,
.sakura-details .p-select.p-disabled {
  background: var(--app-surface);
  color: var(--app-muted);
  border-color: color-mix(in srgb, #2a3045 60%, transparent);
}

.sakura-details .p-select.p-disabled .p-select-label,
.sakura-details .p-select.p-disabled .p-select-dropdown {
  color: var(--app-muted);
}

/* Same size as the "Locked once saved" hint beside Identity, checkbox shrunk to match */
.sakura-details .same-address {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.7rem;
  cursor: pointer;
}

.sakura-details .same-address .p-checkbox,
.sakura-details .same-address .p-checkbox-box {
  width: 14px;
  height: 14px;
}

.sakura-details .same-address .p-checkbox-box {
  border-radius: 4px;
}

.sakura-details .same-address .p-checkbox-icon {
  width: 9px;
  height: 9px;
  font-size: 9px;
}

/* Declarations in a card of their own, above Save */
.sakura-details .declarations {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 2px;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
}

.sakura-details .consent {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.72rem;
  line-height: 1.4;
  cursor: pointer;
}

.sakura-details .consent .p-checkbox {
  flex: 0 0 auto;
  margin-top: 1px;
}

.sakura-details .consent .p-checkbox,
.sakura-details .consent .p-checkbox-box {
  width: 16px;
  height: 16px;
}

.sakura-details .consent .p-checkbox-box {
  border-radius: 4px;
}

.sakura-details .consent .p-checkbox-icon {
  width: 11px;
  height: 11px;
  font-size: 11px;
}

/* Ticked boxes: filled in the dialog's accent (gold on dark, sakura pink on light) with a bold
   tick: navy on gold, lavender on pink. Locked boxes (verified accounts' declarations) use a
   softer fill so they read as settled. */
.sakura-details {
  --tick: #1b2550;
  --tick-box: var(--dlg-accent);
}

:root:not(.app-dark) .sakura-details {
  --tick: #eef1ff;
}

.sakura-details .p-checkbox-checked .p-checkbox-box {
  border-color: var(--tick-box);
  background: var(--tick-box);
}

/* Hover included: PrimeVue switches the tick to its own hover color */
.sakura-details .p-checkbox-checked .p-checkbox-icon,
.sakura-details .p-checkbox-checked:not(.p-disabled):has(.p-checkbox-input:hover) .p-checkbox-icon {
  color: var(--tick);
}

/* Hovering a box that can still be changed: the fill brightens a little */
.sakura-details .p-checkbox-checked:not(.p-disabled):has(.p-checkbox-input:hover) .p-checkbox-box {
  border-color: color-mix(in srgb, var(--tick-box) 82%, #fff);
  background: color-mix(in srgb, var(--tick-box) 82%, #fff);
}

/* The tick is a filled path; a stroke in the same color thickens it */
.sakura-details .p-checkbox-checked .p-checkbox-icon path {
  stroke: currentColor;
  stroke-width: 1.6px;
  stroke-linejoin: round;
}

/* Locked: PrimeVue's disabled style would fade the box and grey the tick until it vanished */
.sakura-details .p-checkbox-checked.p-disabled {
  opacity: 1;
}

/* Softer fill (accent blended into the card), tick kept at full strength */
.sakura-details .p-checkbox-checked.p-disabled .p-checkbox-box {
  border-color: transparent;
  background: color-mix(in srgb, var(--tick-box) 55%, var(--app-surface));
}

/* More specific than PrimeVue's `.p-checkbox.p-disabled .p-checkbox-box .p-checkbox-icon`, which
   ties with a shorter selector and wins by loading later */
.sakura-details .p-checkbox.p-checkbox-checked.p-disabled .p-checkbox-box .p-checkbox-icon {
  color: var(--tick);
}

.sakura-details .consent:has(.p-disabled) {
  cursor: default;
}

.sakura-details .p-checkbox:not(.p-disabled):has(.p-checkbox-input:focus-visible) .p-checkbox-box {
  border-color: var(--dlg-accent);
}

.sakura-details .consent sup {
  color: var(--dlg-accent);
}

/* Birthdate calendar (teleported to <body>): a clean card with one bold "Month Year" title,
   quiet weekday labels, round day cells and a solid pick in the Save button's colors */
.p-datepicker-panel.sakura-datepicker {
  --dp-pick: #dbe3fc;
  --dp-pick-ink: #1b2550;
  --dp-hover: rgb(255 255 255 / 0.07);
  min-width: 300px;
  padding: 12px 14px 14px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
  box-shadow: 0 14px 34px rgb(0 0 0 / 0.45);
  color: var(--app-text);
  font-family: 'Montserrat', sans-serif;
}

:root:not(.app-dark) .p-datepicker-panel.sakura-datepicker {
  --dp-pick: #1b2550;
  --dp-pick-ink: #ffffff;
  --dp-hover: rgb(27 37 80 / 0.07);
  box-shadow: 0 14px 34px rgb(27 37 80 / 0.16);
}

.sakura-datepicker .p-datepicker-header {
  padding: 0 0 8px;
  border: none;
  background: transparent;
}

.sakura-datepicker .p-datepicker-title {
  gap: 6px;
}

.sakura-datepicker .p-datepicker-select-month,
.sakura-datepicker .p-datepicker-select-year,
.sakura-datepicker .p-datepicker-decade {
  padding: 4px 6px;
  border-radius: 6px;
  color: var(--app-text);
  /* Buttons don't inherit the font by default; the decade title is plain text and does */
  font-family: inherit;
  font-weight: 700;
  font-size: 0.95rem;
}

/* Day view: the month button reads "May 2004" (year from data-year, see datePickerPt) and the
   separate year button is hidden, so the title is one step back to the month grid */
.sakura-datepicker .p-datepicker-select-month::after {
  content: '\00a0' attr(data-year);
}

.sakura-datepicker .p-datepicker-select-month + .p-datepicker-select-year {
  display: none;
}

.sakura-datepicker .p-datepicker-select-month:not(:disabled):hover,
.sakura-datepicker .p-datepicker-select-year:not(:disabled):hover {
  background: var(--dp-hover);
  color: var(--app-text);
}

.sakura-datepicker .p-datepicker-prev-button,
.sakura-datepicker .p-datepicker-next-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: var(--app-text);
}

.sakura-datepicker .p-datepicker-prev-button:not(:disabled):hover,
.sakura-datepicker .p-datepicker-next-button:not(:disabled):hover {
  background: var(--dp-hover);
  color: var(--app-text);
}

.sakura-datepicker .p-datepicker-prev-button:disabled,
.sakura-datepicker .p-datepicker-next-button:disabled {
  opacity: 0.3;
}

.sakura-datepicker .p-datepicker-day-view {
  margin: 0;
}

.sakura-datepicker .p-datepicker-weekday {
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.72rem;
}

.sakura-datepicker .p-datepicker-day-cell {
  padding: 2px;
}

.sakura-datepicker .p-datepicker-day {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  color: var(--app-text);
  font-weight: 500;
  font-size: 0.9rem;
}

.sakura-datepicker .p-datepicker-day:not(.p-datepicker-day-selected):not(.p-disabled):hover {
  background: var(--dp-hover);
  color: var(--app-text);
}

.sakura-datepicker .p-datepicker-day.p-disabled {
  color: var(--app-muted);
  opacity: 0.4;
}

/* The calendar shrinks to its content by default, leaving the grids off-center in the wider
   panel; make it fill the panel */
.sakura-datepicker .p-datepicker-calendar-container,
.sakura-datepicker .p-datepicker-calendar {
  width: 100%;
}

/* PrimeVue lays these out as percentage-width inline cells; a grid lets the gap work */
.sakura-datepicker .p-datepicker-month-view,
.sakura-datepicker .p-datepicker-year-view {
  display: grid;
  gap: 10px;
  /* Both are 3 across and 4 rows, so they match */
  grid-auto-rows: 1fr;
  height: 222px;
  width: 100%;
  margin: 12px 0 4px;
}

.sakura-datepicker .p-datepicker-month-view {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.sakura-datepicker .p-datepicker-year-view {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.sakura-datepicker .p-datepicker-month,
.sakura-datepicker .p-datepicker-year {
  width: auto;
  padding: 0;
  border-radius: 10px;
  color: var(--app-text);
  font-weight: 600;
  font-size: 0.85rem;
}

.sakura-datepicker .p-datepicker-month:not(.p-datepicker-month-selected):not(.p-disabled):hover,
.sakura-datepicker .p-datepicker-year:not(.p-datepicker-year-selected):not(.p-disabled):hover {
  background: var(--dp-hover);
  color: var(--app-text);
}

.sakura-datepicker .p-datepicker-month.p-disabled,
.sakura-datepicker .p-datepicker-year.p-disabled {
  color: var(--app-muted);
  opacity: 0.4;
}
/* Past the 21+ cutoff: visible while paging, but not pickable */
.sakura-datepicker .p-datepicker-day.p-disabled,
.sakura-datepicker .p-datepicker-month.p-disabled,
.sakura-datepicker .p-datepicker-year.p-disabled {
  cursor: default;
}

/* The pick: solid fill in the Save button's colors (lavender in dark mode, navy in light) */
.sakura-datepicker .p-datepicker-day-selected,
.sakura-datepicker .p-datepicker-month-selected,
.sakura-datepicker .p-datepicker-year-selected,
.sakura-datepicker .p-datepicker-day-selected:hover,
.sakura-datepicker .p-datepicker-month-selected:hover,
.sakura-datepicker .p-datepicker-year-selected:hover {
  background: var(--dp-pick);
  color: var(--dp-pick-ink);
  font-weight: 800;
}

.sakura-datepicker .p-datepicker-day:focus-visible,
.sakura-datepicker .p-datepicker-month:focus-visible,
.sakura-datepicker .p-datepicker-year:focus-visible {
  outline: 2px solid var(--dp-pick);
  outline-offset: 1px;
}
</style>
