import { ref, type ComputedRef, type Ref } from 'vue'
import { MIN_BIRTH_YEAR } from '@/constants/personalDetails'

export const MIN_BIRTHDATE = new Date(MIN_BIRTH_YEAR, 0, 1)
export const MAX_PAGE_DATE = new Date(2099, 11, 31)

const MIN_YEAR = MIN_BIRTHDATE.getFullYear()
const MAX_YEAR = MAX_PAGE_DATE.getFullYear()

interface PtState {
  state: { currentYear: number; currentMonth: number; currentView: string }
}

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

const navLimit = (stop: boolean) => ({
  root: stop ? { disabled: true, onClickCapture: blockPick, onKeydownCapture: blockPick } : {},
})

export function useBirthdatePicker(birthdate: Ref<Date | null>, maxBirthdate: ComputedRef<Date>) {
  const datePickerPt = {
    pcPrevButton: ({ state }: PtState) => navLimit(atStart(state)),
    pcNextButton: ({ state }: PtState) => navLimit(atEnd(state)),
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

  return { datePickerPt, birthdatePicker, openOnYears }
}
