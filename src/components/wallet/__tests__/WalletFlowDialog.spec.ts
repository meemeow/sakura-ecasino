import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { fireEvent, screen, waitFor } from '@testing-library/vue'
import WalletFlowDialog from '@/components/wallet/WalletFlowDialog.vue'
import { renderWithApp } from '@/test/renderWithApp'

const mocks = vi.hoisted(() => ({ createDeposit: vi.fn() }))

const state = vi.hoisted(() => ({
  wallet: null as unknown as {
    balance: number
    profile: { lastReloadBonusAt?: { toDate(): Date } } | null
    turnover: { met: boolean; remaining: number; required: number; progress: number }
  },
}))

vi.mock('@/services/wallet', () => ({ createDeposit: mocks.createDeposit }))
vi.mock('@/stores/wallet', () => ({ useWalletStore: () => state.wallet }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: { uid: 'player-1' } }) }))

beforeEach(() => {
  mocks.createDeposit.mockReset()
  state.wallet = reactive({
    balance: 1_000,
    profile: null,
    turnover: { met: true, remaining: 0, required: 0, progress: 1 },
  })
})

const open = (mode: 'deposit' | 'withdraw') =>
  renderWithApp(WalletFlowDialog, { props: { visible: true, mode } })

const chip = (amount: string) =>
  screen.getByText(`₱${amount}`, { selector: '.flow-chip-amount' }).closest('button')!
const continueButton = () => screen.getByRole('button', { name: 'Continue' })

describe('deposit', () => {
  it('asks for at least the minimum deposit', async () => {
    await open('deposit')
    await fireEvent.click(continueButton())
    expect(screen.getByRole('alert')).toHaveTextContent('Minimum deposit is ₱20.')
  })

  it('adds the 30% reload bonus and opens the QR payment', async () => {
    mocks.createDeposit.mockResolvedValue('tx-1')
    const { router, emitted } = await open('deposit')
    await fireEvent.click(chip('500'))
    expect(screen.getByText('+₱150.00')).toBeInTheDocument()
    await fireEvent.click(continueButton())

    await fireEvent.click(screen.getByRole('radio', { name: 'Maya' }))
    expect(screen.getByText('Deposit via Maya')).toBeInTheDocument()
    expect(screen.getByText('₱650.00')).toBeInTheDocument()
    expect(screen.getByText('₱2,000.00')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Deposit ₱500' }))
    expect(mocks.createDeposit).toHaveBeenCalledWith('player-1', 500, 'Maya', 150)
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/wallet/deposit/tx-1'))
    expect(emitted()['update:visible']).toEqual([[false]])
  })

  it('skips the bonus when it is switched off', async () => {
    mocks.createDeposit.mockResolvedValue('tx-2')
    await open('deposit')
    await fireEvent.click(screen.getByRole('switch', { name: 'Reload Bonus' }))
    await fireEvent.click(chip('200'))
    await fireEvent.click(continueButton())
    await fireEvent.click(screen.getByRole('button', { name: 'Deposit ₱200' }))
    expect(mocks.createDeposit).toHaveBeenCalledWith('player-1', 200, 'GCash', 0)
  })

  it('locks the bonus once it was used today', async () => {
    state.wallet.profile = { lastReloadBonusAt: { toDate: () => new Date() } }
    await open('deposit')
    expect(screen.getByRole('switch', { name: 'Reload Bonus' })).toBeDisabled()
    expect(screen.getByText(/Used today/)).toBeInTheDocument()
    await fireEvent.click(chip('500'))
    expect(screen.queryByText('+₱150.00')).not.toBeInTheDocument()
  })

  it('explains a rejected deposit without leaving the dialog', async () => {
    mocks.createDeposit.mockRejectedValue({ code: 'permission-denied' })
    const { router } = await open('deposit')
    await fireEvent.click(chip('100'))
    await fireEvent.click(continueButton())
    await fireEvent.click(screen.getByRole('button', { name: 'Deposit ₱100' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/If you have one open/)
    expect(router.currentRoute.value.fullPath).toBe('/')
  })

  it('refuses a deposit that would pass the balance cap', async () => {
    state.wallet.balance = 9_999_999_900
    await open('deposit')
    await fireEvent.click(chip('100'))
    await fireEvent.click(continueButton())
    expect(screen.getByRole('alert')).toHaveTextContent("Your balance can't go above")
  })
})

describe('withdraw', () => {
  it('stays locked until the turnover is met', async () => {
    state.wallet.turnover = { met: false, remaining: 250, required: 1_000, progress: 0.75 }
    const { router } = await open('withdraw')
    expect(screen.getByText('Turnover not met yet')).toBeInTheDocument()
    expect(screen.getByText('₱250.00')).toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', { name: 'Play slots' }))
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/slots'))
  })

  it('disables amounts above the balance', async () => {
    await open('withdraw')
    expect(chip('500')).toBeEnabled()
    expect(chip('5,000')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Max' })).toBeEnabled()
  })
})
