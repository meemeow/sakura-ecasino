import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { REQUIRED_DETAILS } from '@/constants/personalDetails'
import type { PersonalDetails, UserProfile } from '@/types'

export function isProfileComplete(profile: UserProfile | null | undefined) {
  return (
    !!profile?.consentedAt && REQUIRED_DETAILS.every((f) => String(profile[f] ?? '').trim() !== '')
  )
}

export type VerificationStatus = 'unverified' | 'verifying' | 'verified'

export function verificationStatus(profile: UserProfile | null | undefined): VerificationStatus {
  if (!isProfileComplete(profile)) return 'unverified'
  return profile?.verifiedAt ? 'verified' : 'verifying'
}

export async function fetchProfile(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.data({ serverTimestamps: 'estimate' }) as UserProfile | undefined
}

export function updateDisplayName(uid: string, displayName: string) {
  return setDoc(doc(db, 'users', uid), { displayName }, { merge: true })
}

export function updatePersonalDetails(uid: string, details: PersonalDetails) {
  return setDoc(
    doc(db, 'users', uid),
    { ...details, consentedAt: serverTimestamp() },
    { merge: true },
  )
}
