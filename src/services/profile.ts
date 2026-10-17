import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import type { PersonalDetails, UserProfile } from '@/types'

/** Personal details a player must fill in before they can use the wallet */
export const REQUIRED_DETAILS: (keyof PersonalDetails)[] = [
  'firstName',
  'lastName',
  'birthdate',
  'nationality',
  'email',
  'occupation',
  'sourceOfIncome',
  'permanentAddress',
  'currentAddress',
]

/** Required details filled in and the privacy/truthfulness declarations accepted */
export function isProfileComplete(profile: UserProfile | null | undefined) {
  return (
    !!profile?.consentedAt && REQUIRED_DETAILS.every((f) => String(profile[f] ?? '').trim() !== '')
  )
}

export type VerificationStatus = 'unverified' | 'verifying' | 'verified'

/**
 * Unverified until the details are complete, then Verifying until an admin approves the account
 * by setting `verifiedAt` (Firebase console / Admin SDK; players can't write it). The wallet
 * stays locked until Verified.
 */
export function verificationStatus(profile: UserProfile | null | undefined): VerificationStatus {
  if (!isProfileComplete(profile)) return 'unverified'
  return profile?.verifiedAt ? 'verified' : 'verifying'
}

export async function fetchProfile(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid))
  // A just-saved consentedAt is still pending on the server; don't read it as null
  return snap.data({ serverTimestamps: 'estimate' }) as UserProfile | undefined
}

// Owner-editable profile fields. firestore.rules lets the owner write anything
// on users/{uid} except `balance`, so these merge writes are allowed.

export function updateDisplayName(uid: string, displayName: string) {
  return setDoc(doc(db, 'users', uid), { displayName }, { merge: true })
}

/**
 * Only called after the player accepts the declarations, so this also records when they did.
 * The rules reject changes to identity fields (name, birthdate, nationality) once set.
 */
export function updatePersonalDetails(uid: string, details: PersonalDetails) {
  return setDoc(
    doc(db, 'users', uid),
    { ...details, consentedAt: serverTimestamp() },
    { merge: true },
  )
}

/** null turns the cap off. Enforcement belongs in the bet Cloud Function. */
export function updateBettingCap(uid: string, bettingCap: number | null) {
  return setDoc(doc(db, 'users', uid), { bettingCap }, { merge: true })
}
