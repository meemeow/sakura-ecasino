import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth'
import { auth } from '@/firebase'

// Local mobile format (09XXXXXXXXX), as typed in the login form
export const PH_MOBILE_PATTERN = /^09\d{9}$/

/** '09171234567' -> '+639171234567' */
export function toE164(localNumber: string) {
  return `+63${localNumber.slice(1)}`
}

// Phone sign-in needs a reCAPTCHA; the invisible one only shows a challenge if Google
// suspects abuse. It lives in its own element on <body> so it survives the dialog closing.
let verifier: RecaptchaVerifier | null = null
let verifierEl: HTMLElement | null = null

function getVerifier() {
  if (!verifier) {
    verifierEl = document.createElement('div')
    document.body.appendChild(verifierEl)
    verifier = new RecaptchaVerifier(auth, verifierEl, { size: 'invisible' })
  }
  return verifier
}

function resetVerifier() {
  verifier?.clear()
  verifierEl?.remove()
  verifier = null
  verifierEl = null
}

/** Texts a 6-digit code. Signing in with a new number creates the account. */
export async function sendPhoneCode(localNumber: string): Promise<ConfirmationResult> {
  try {
    return await signInWithPhoneNumber(auth, toE164(localNumber), getVerifier())
  } catch (e) {
    // A used or failed reCAPTCHA can't be reused
    resetVerifier()
    throw e
  }
}

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-phone-number': 'Enter a valid mobile number.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/quota-exceeded': 'SMS limit reached. Please try again later.',
  'auth/invalid-verification-code': 'Incorrect code. Please try again.',
  'auth/code-expired': 'This code has expired. Request a new one.',
  'auth/captcha-check-failed': 'Verification failed. Please try again.',
  'auth/operation-not-allowed': 'Phone sign-in is not enabled yet.',
  'auth/billing-not-enabled': 'Phone sign-in is not enabled yet.',
}

export function authErrorMessage(e: unknown) {
  const code = (e as { code?: string })?.code
  if (code && AUTH_ERRORS[code]) return AUTH_ERRORS[code]
  console.error('Phone auth failed:', e)
  return `Something went wrong (${code ?? 'unknown error'}). Please try again.`
}
