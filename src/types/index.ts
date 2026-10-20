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
  /** When the last Reload Bonus was credited; one per Philippine day (see claimDeposit) */
  lastReloadBonusAt?: Timestamp
  /**
   * The player's pending QR deposit (a transactions doc id), so only one can be open at a time
   * and its bonus can't be stacked. The player sets it in the same write that opens the deposit,
   * and only while no other deposit is open (firestore.rules); claiming or closing clears it.
   */
  pendingDepositId?: string | null
  /**
   * The deposit the last balance credit was for. The claim write sets it, so firestore.rules can
   * check that write against that deposit (approved, credited once, exact amounts).
   */
  claimedDepositId?: string
}

export type TransactionType = 'deposit' | 'withdrawal' | 'bonus' | 'bet' | 'win'

/**
 * users/{uid}/transactions/{txId}. A QR deposit's whole life is client writes that
 * firestore.rules check field by field (Spark plan, no Cloud Functions): the player opens it, adds
 * `sentAmount` + `reference` once paid, and their app claims it (services/wallet.ts claimDeposit)
 * once the admin has set `approvedAt` in the Firebase console. Players can't write approvedAt.
 */
export interface Transaction {
  type: TransactionType
  /** Always positive; the type decides whether it adds or subtracts */
  amount: number
  createdAt: Timestamp
  /**
   * A QR deposit is 'pending' until it's credited ('successful', after approvedAt) or rejected
   * ('failed', after rejectedAt). Still pending past its window it reads as expired
   * (depositExpiresAt in components/wallet/walletOptions.ts).
   */
  status?: 'successful' | 'pending' | 'failed' | 'expired'
  /** Payment channel for deposits/withdrawals (e.g. Maya, GCash) */
  method?: string
  /** QR deposits: the Reload Bonus worked out when it was opened (0 if none) */
  bonus?: number
  /** QR deposits: the bonus actually credited (0 if today's was already used by then) */
  creditedBonus?: number
  /** QR deposits, from the player: the amount they sent (must equal `amount`) and its receipt ref */
  sentAmount?: number
  reference?: string
  submittedAt?: Timestamp
  /** QR deposits: set by the admin in the Firebase console (timestamp), like verifiedAt */
  approvedAt?: Timestamp
  rejectedAt?: Timestamp
  /** Bets and wins */
  gameId?: string
  gameName?: string
  roundId?: string
}
