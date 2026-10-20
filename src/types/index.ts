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
  /**
   * Turnover: how much the player must bet before they can withdraw, in pesos; written only
   * by Cloud Functions. Each deposit adds 1x its amount plus 10x its Reload Bonus
   * (turnoverFor in components/wallet/walletOptions.ts); each bet counts down `turnoverRemaining`.
   * `turnoverRequired` is the total of the current cycle, for the progress bar; a deposit made
   * once the remaining reaches 0 starts a new cycle.
   */
  turnoverRequired?: number
  turnoverRemaining?: number
  /** When the last Reload Bonus was credited; one per Philippine day. Cloud Functions only. */
  lastReloadBonusAt?: Timestamp
  /**
   * The player's pending QR deposit (a transactions doc id), so only one can be open at a time
   * and its bonus can't be stacked. Set and cleared by Cloud Functions only.
   */
  pendingDepositId?: string | null
}

export type TransactionType = 'deposit' | 'withdrawal' | 'bonus' | 'bet' | 'win'

/**
 * users/{uid}/transactions/{txId}, written by Cloud Functions. The one exception is a pending
 * QR deposit: its owner adds `sentAmount` and `reference` once they've paid (firestore.rules).
 */
export interface Transaction {
  type: TransactionType
  /** Always positive; the type decides whether it adds or subtracts */
  amount: number
  createdAt: Timestamp
  /**
   * A QR deposit is 'pending' until an admin sets `approvedAt` (credited, then 'successful') or
   * `rejectedAt` ('failed'). Still pending after `expiresAt` reads as expired (pendingStatus).
   */
  status?: 'successful' | 'pending' | 'failed' | 'expired'
  /** Payment channel for deposits/withdrawals (e.g. Maya, GCash) */
  method?: string
  /** QR deposits: the Reload Bonus worked out when it was created (0 if none), credited on approval */
  bonus?: number
  /** QR deposits: the 10-minute window to pay and submit the reference */
  expiresAt?: Timestamp
  /** QR deposits, from the player: the amount they sent (must equal `amount`) and its receipt ref */
  sentAmount?: number
  reference?: string
  submittedAt?: Timestamp
  /** QR deposits: set by the admin in the Firebase console, like users/{uid}.verifiedAt */
  approvedAt?: Timestamp
  rejectedAt?: Timestamp
  /** Bets and wins */
  gameId?: string
  gameName?: string
  roundId?: string
}
