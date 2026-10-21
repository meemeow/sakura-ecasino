import vipIcon from '@/assets/icons/promos/vip.svg'
import { publicUrl } from '@/utils/publicUrl'

export interface Promotion {
  id: string
  title: string
  summary: string

  background: string
  eyebrow: string
  eyebrowLogo?: string
  headline: string
  amount: string
  subline: string
  pill?: string
  covers?: string[]
  icon?: string
  coin?: string
  seal?: boolean

  steps: string[]
  terms: string[]
  cta: { label: string; to: string }
}

export const promotions: Promotion[] = [
  {
    id: 'reload',
    title: 'Daily Reload Bonus',
    summary: 'Get 30% extra on one deposit every day, up to ₱15,000.',
    background: publicUrl('/hero/sweet-bonanza-1000.webp'),
    eyebrow: 'Every day',
    headline: 'Reload Bonus',
    amount: '30% extra',
    subline: 'on one deposit a day',
    pill: 'Resets at midnight',
    coin: '%',
    steps: [
      'Open Deposit and keep the Reload Bonus switch on.',
      'Deposit ₱20 to ₱50,000 with GCash or Maya.',
      'Once your deposit is approved, the 30% extra is added to your balance with it.',
    ],
    terms: [
      'One Reload Bonus per day. It comes back after midnight, Philippine time.',
      'Before withdrawing, bet 1× your deposit plus 10× the bonus.',
      'You need a verified account to deposit.',
      'Sakura is a portfolio project: any money sent is treated as a donation (see the Terms).',
    ],
    cta: { label: 'Deposit now', to: '/wallet?mode=deposit' },
  },
  {
    id: 'vip',
    title: 'VIP Level Up',
    summary: 'Climb 50 VIP levels as you deposit and play, from Member up to the gold Sakura chip.',
    background: publicUrl('/hero/gates-of-gatot-kaca-1000.webp'),
    eyebrow: 'Sakura VIP Club',
    headline: 'Level Up',
    amount: '50 Levels',
    subline: 'from Member to the Sakura chip',
    pill: 'Everyone starts at VIP 0',
    icon: vipIcon,
    steps: [
      'Every deposit adds to your total deposit, and every bet adds to your total bet.',
      "Reach both of a level's minimums to move up to it.",
      'Each level grows a petal on your VIP chip, and a new rank starts every 10 levels: Sprout, Bud, Blossom, Moonlit and Onyx.',
    ],
    terms: [
      'VIP 1 needs ₱100 in total deposits and ₱15,000 in total bets. Each level after needs ₱100 more in deposits and a higher total bet.',
      'Totals never go down, so neither does your level.',
      'Your progress fills the ring around your avatar in the sidebar.',
    ],
    cta: { label: 'View VIP Club', to: '/vip' },
  },
  {
    id: 'gates-of-olympus',
    title: 'Featured: Gates of Olympus 1000',
    summary:
      "Play Sakura's own take on Gates of Olympus 1000, where Zeus multiplies every tumble up to 1000x.",
    background: publicUrl('/hero/gates-of-olympus-1000.webp'),
    eyebrow: 'Featured slot',
    headline: 'Gates of Olympus',
    amount: '1000x',
    subline: 'top multiplier from Zeus',
    pill: 'Playable now',
    covers: [
      publicUrl('/games/gates-of-olympus-1000.webp'),
      publicUrl('/games/gates-of-olympus-xmas-1000.webp'),
    ],
    steps: [
      'Open Gates of Olympus 1000 from the lobby or the Slots tab.',
      'Winning symbols tumble away and new ones drop in, so one spin can win again and again.',
      "Zeus's multiplier orbs, worth up to 1000x, add up across a tumble.",
    ],
    terms: [
      "A recreation built with Pragmatic Play's assets and based on their game. Sakura has no partnership with Pragmatic Play; the game and its artwork belong to them.",
      'Bets count towards your turnover and VIP level.',
    ],
    cta: { label: 'Play now', to: '/play/gates-of-olympus-1000' },
  },
  {
    id: 'starlight-princess',
    title: 'Coming Soon: Starlight Princess 1000',
    summary: 'The next slot on its way to Sakura, with magical multipliers raining from the sky.',
    background: publicUrl('/hero/starlight-princess-1000.webp'),
    eyebrow: 'Coming soon',
    headline: 'Starlight Princess',
    amount: '1000x',
    subline: 'top magical multiplier',
    pill: 'Next on Sakura',
    covers: [publicUrl('/games/starlight-princess-1000.webp')],
    steps: [
      'Starlight Princess 1000 is the next slot being built.',
      'It will appear in the lobby and the Slots tab as soon as it can be played.',
      'Until then, try Gates of Olympus 1000.',
    ],
    terms: [
      "Based on Pragmatic Play's Starlight Princess 1000. Sakura has no partnership with Pragmatic Play; the game and its artwork belong to them.",
    ],
    cta: { label: 'Browse slots', to: '/slots' },
  },
  {
    id: 'verified',
    title: 'Get Verified',
    summary:
      'Complete your profile to become a Verified Account and unlock deposits and the Reload Bonus.',
    background: publicUrl('/hero/sugar-rush-1000.webp'),
    eyebrow: 'Get started',
    headline: 'Get Verified',
    amount: '10/10',
    subline: 'profile details complete',
    pill: 'Unlocks deposits',
    seal: true,
    steps: [
      'Open your Account and fill in your Personal Details.',
      'Accept the declarations and save, so your profile reaches 10/10.',
      "Once it's approved, your account shows the gold Verified Account seal.",
    ],
    terms: [
      'A verified account is needed to deposit and withdraw, and so to get the Reload Bonus.',
      'Made-up details are fine: Sakura is a portfolio project (see the Privacy Policy).',
    ],
    cta: { label: 'Complete profile', to: '/account?completeProfile=1' },
  },
]
