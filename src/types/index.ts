import type { Timestamp } from 'firebase/firestore'

export type GameCategory = 'slots' | 'live' | 'table' | 'gameshow' | 'fishing'

export interface Game {
  id: string
  name: string
  provider: string
  category: GameCategory
  thumbnail: string
  playable?: boolean
}

export interface PersonalDetails {
  firstName: string
  lastName: string
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
  consentedAt?: Timestamp
  verifiedAt?: Timestamp
  bettingCap?: number | null
  totalDeposit?: number
  totalBet?: number
  turnoverRequired?: number
  turnoverRemaining?: number
  lastReloadBonusAt?: Timestamp
  pendingDepositId?: string | null
  claimedDepositId?: string
}

export type TransactionType = 'deposit' | 'withdrawal' | 'bonus' | 'bet' | 'win'

export interface Transaction {
  type: TransactionType
  amount: number
  createdAt: Timestamp
  status?: 'successful' | 'pending' | 'failed' | 'expired'
  method?: string
  bonus?: number
  creditedBonus?: number
  sentAmount?: number
  reference?: string
  submittedAt?: Timestamp
  approvedAt?: Timestamp
  rejectedAt?: Timestamp
  gameId?: string
  gameName?: string
  roundId?: string
}
