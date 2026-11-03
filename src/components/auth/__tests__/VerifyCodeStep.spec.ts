import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/vue'
import type { ConfirmationResult } from 'firebase/auth'
import VerifyCodeStep from '@/components/auth/VerifyCodeStep.vue'
import { renderWithApp } from '@/test/renderWithApp'

const auth = vi.hoisted(() => ({ sendPhoneCode: vi.fn() }))

vi.mock('@/services/auth', () => ({
  sendPhoneCode: auth.sendPhoneCode,
  authErrorMessage: (e: unknown) => `failed: ${(e as Error).message}`,
}))

function confirmation(result: 'ok' | 'reject' = 'ok') {
  return {
    verificationId: 'v',
    confirm: vi.fn(() =>
      result === 'ok' ? Promise.resolve({}) : Promise.reject(new Error('wrong code')),
    ),
  } as unknown as ConfirmationResult & { confirm: ReturnType<typeof vi.fn> }
}

async function renderStep(conf: ConfirmationResult, demoCode?: string) {
  const view = await renderWithApp(VerifyCodeStep, {
    props: { confirmation: conf, phone: '09171234567', displayPhone: '917 123 4567', demoCode },
  })
  return { ...view, input: screen.getByLabelText('6-digit code') as HTMLInputElement }
}

describe('VerifyCodeStep', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('keeps only digits while typing', async () => {
    const conf = confirmation()
    const { input } = await renderStep(conf)
    await fireEvent.update(input, '1a2-D3')
    expect(input.value).toBe('123')
    expect(conf.confirm).not.toHaveBeenCalled()
  })

  it('confirms the code once six digits are in and reports success', async () => {
    const conf = confirmation()
    const { input, emitted } = await renderStep(conf)
    await fireEvent.update(input, '12 34 56 7')
    expect(input.value).toBe('123456')
    await waitFor(() => expect(emitted().verified).toHaveLength(1))
    expect(conf.confirm).toHaveBeenCalledWith('123456')
  })

  it('shows the error and clears the boxes on a wrong code', async () => {
    const conf = confirmation('reject')
    const { input, emitted } = await renderStep(conf)
    await fireEvent.update(input, '000000')
    expect(await screen.findByRole('alert')).toHaveTextContent('failed: wrong code')
    expect(input.value).toBe('')
    expect(emitted().verified).toBeUndefined()
  })

  it('fills and confirms the demo code by itself', async () => {
    const conf = confirmation()
    const { emitted } = await renderStep(conf, '654321')
    expect(screen.getByText('654321')).toBeInTheDocument()
    await waitFor(() => expect(emitted().verified).toHaveLength(1))
    expect(conf.confirm).toHaveBeenCalledWith('654321')
  })

  it('unlocks resend after the countdown and sends a new code', async () => {
    const fresh = confirmation()
    auth.sendPhoneCode.mockResolvedValue(fresh)
    const { emitted } = await renderStep(confirmation())
    const resend = screen.getByRole('button', { name: /Resend in 0:30/ })
    expect(resend).toBeDisabled()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(resend).toBeEnabled()
    await fireEvent.click(resend)
    expect(auth.sendPhoneCode).toHaveBeenCalledWith('09171234567')
    await waitFor(() => expect(emitted()['update:confirmation']).toEqual([[fresh]]))
    expect(screen.getByRole('button', { name: /Resend in 0:30/ })).toBeDisabled()
  })

  it('goes back to change the number', async () => {
    const { emitted } = await renderStep(confirmation())
    await fireEvent.click(screen.getByRole('button', { name: 'Change' }))
    expect(emitted().back).toHaveLength(1)
  })
})
