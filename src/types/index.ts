import type { Timestamp } from 'firebase/firestore'

export type GameCategory = 'slots' | 'live' | 'table' | 'gameshow' | 'fishing'

export interface Game {
  id: string
  name: string
  provider: string
  category: GameCategory
  thumbnail: string
  /** Has a playable implementation at /play/:id */
  playable?: boolean
}

/** Owner-editable KYC fields on users/{uid}, set in the Personal Details dialog */
export interface PersonalDetails {
  /** Identity fields: firestore.rules locks these once set */
  firstName: string
  lastName: string
  /** 'YYYY-MM-DD' */
  birthdate: string
  nationality: string
  middleName: string
  email: string
  occupation: string
  sourceOfIncome: string
  placeOfBirth: string
  permanentAddress: string
  currentAddress: string
  sameAsPermanent: boolean
}

export interface UserProfile extends Partial<PersonalDetails> {
  displayName?: string
  balance: number
  createdAt: Timestamp
  /** Last time the player accepted the data privacy and truthfulness declarations */
  consentedAt?: Timestamp
  /** Set by an admin after reviewing the details (players can't write it); unlocks the wallet */
  verifiedAt?: Timestamp
  /** Personal betting cap in pesos; null/absent means no cap */
  bettingCap?: number | null
  /** Lifetime totals in pesos that decide the VIP level; written only by Cloud Functions */
  totalDeposit?: number
  totalBet?: number
}

export type TransactionType = 'deposit' | 'withdrawal' | 'bonus' | 'bet' | 'win'

/** users/{uid}/transactions/{txId}, written only by Cloud Functions */
export interface Transaction {
  type: TransactionType
  /** Always positive; the type decides whether it adds or subtracts */
  amount: number
  createdAt: Timestamp
  status?: 'successful' | 'pending' | 'failed'
  /** Payment channel for deposits/withdrawals (e.g. Maya, GCash) */
  method?: string
  /** Bets and wins */
  gameId?: string
  gameName?: string
  roundId?: string
}
