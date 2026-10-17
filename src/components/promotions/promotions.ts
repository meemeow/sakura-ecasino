// Promotions shown on /promotions. MOCKUP: amounts, dates and rules are placeholders.
import vipIcon from '@/assets/icons/promos/vip.svg'
import raffleIcon from '@/assets/icons/promos/raffle.svg'

export interface Promotion {
  id: string
  /** Card title + description under the banner */
  title: string
  summary: string

  /** Banner: scenery background, text on the left, art on the right */
  background: string
  eyebrow: string
  /** Small logo shown instead of the eyebrow text */
  eyebrowLogo?: string
  headline: string
  amount: string
  subline: string
  /** Date or condition pill under the subline */
  pill?: string
  /** Game covers fanned out on the right */
  covers?: string[]
  /** Or a single icon with a glow */
  icon?: string

  /** "More info" dialog */
  steps: string[]
  terms: string[]
  cta: { label: string; to: string }
}

export const promotions: Promotion[] = [
  {
    id: 'welcome',
    title: 'Sakura Welcome Bonus',
    summary: 'Get 100% up to ₱20,000 on your first deposit, plus ₱30 free when you sign up.',
    background: '/hero/sweet-bonanza-1000.webp',
    eyebrow: 'New players',
    headline: 'Welcome Bonus',
    amount: '₱20,000',
    subline: '100% deposit match + ₱30 free',
    pill: 'Sign up today',
    covers: ['/games/sweet-bonanza-1000.webp', '/games/sugar-rush-1000.webp'],
    steps: [
      'Create your Sakura account and get ₱30 free credit right away.',
      'Make your first deposit of at least ₱100.',
      'We match it 100%, up to ₱20,000, as bonus credit.',
    ],
    terms: [
      'New players only, one bonus per person.',
      'Bonus credit has a 20x wagering requirement before it can be withdrawn.',
      'Bonus expires 30 days after it is credited.',
    ],
    cta: { label: 'Deposit now', to: '/wallet' },
  },
  {
    id: 'pragmatic-daily-wins',
    title: 'Pragmatic Play Daily Wins',
    summary: 'Climb the daily leaderboard on Pragmatic Play slots and win cash prizes every week.',
    background: '/hero/gates-of-olympus-1000.webp',
    eyebrow: 'Pragmatic Play',
    eyebrowLogo: '/providers/pragmatic-play.svg',
    headline: 'Daily Wins',
    amount: '₱1,000,000',
    subline: 'in weekly prizes',
    pill: 'Oct 1 – Oct 31, 2026',
    covers: ['/games/gates-of-olympus-1000.webp', '/games/starlight-princess-1000.webp'],
    steps: [
      'Play any Pragmatic Play slot with a bet of ₱10 or more.',
      'Every win earns leaderboard points based on its multiplier.',
      'Top players each day share the prize pool, paid out weekly.',
    ],
    terms: [
      'Only real-money spins count; bonus spins are excluded.',
      'Prizes are paid as cash with no wagering requirement.',
      'Pragmatic Play and Sakura may change or end the promotion at any time.',
    ],
    cta: { label: 'Play slots', to: '/slots' },
  },
  {
    id: 'vip',
    title: 'Sakura VIP Club',
    summary: 'Level up through 50 VIP levels and unlock exclusive rewards as you play.',
    background: '/hero/starlight-princess-1000.webp',
    eyebrow: 'Exclusive perks',
    headline: 'VIP Club',
    amount: '50 Levels',
    subline: 'of rewards and cashback',
    pill: 'Join now',
    icon: vipIcon,
    steps: [
      'Every deposit and bet counts towards your VIP progress.',
      'Reach the next level to unlock bigger rewards and perks.',
      'Higher ranks get a personal account manager.',
    ],
    terms: [
      'VIP levels are based on total deposits and total bets.',
      'Rewards are reviewed monthly and depend on your current level.',
    ],
    cta: { label: 'View VIP Club', to: '/vip' },
  },
  {
    id: 'grand-draw',
    title: 'Sakura Monthly Grand Draw',
    summary: 'Every ₱500 you deposit earns a ticket for our ₱200,000 monthly cash draw.',
    background: '/hero/gates-of-gatot-kaca-1000.webp',
    eyebrow: 'Monthly raffle',
    headline: 'Grand Draw',
    amount: '₱200,000',
    subline: 'cash prizes, 50 winners',
    pill: 'Draw on Oct 31, 2026',
    icon: raffleIcon,
    steps: [
      'Every ₱500 deposited this month earns one raffle ticket.',
      'Tickets are added to your account automatically.',
      'Winners are drawn live on the last day of the month.',
    ],
    terms: [
      'No limit on tickets per player.',
      'Cash prizes are credited within 3 days of the draw.',
      'Winners must have a verified account.',
    ],
    cta: { label: 'Deposit now', to: '/wallet' },
  },
]
