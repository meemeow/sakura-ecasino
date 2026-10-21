export type LegalDoc = 'terms' | 'privacy'

export interface LegalSection {
  heading: string
  body: string[]
}

export interface LegalContent {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}

export const legalContent: Record<LegalDoc, LegalContent> = {
  terms: {
    title: 'Terms & Conditions',
    updated: 'October 21, 2026',
    intro:
      'Sakura is a personal portfolio project that shows what I can build. It is not a real online casino, it is not licensed by PAGCOR, and it is not run for profit.',
    sections: [
      {
        heading: '1. A portfolio project',
        body: [
          'I built Sakura because I was curious how an online casino works behind the scenes: accounts, wallets, deposits, bonuses and slot games. It exists to test those ideas and to showcase my work.',
          'I promise not to turn Sakura into a for-profit casino.',
        ],
      },
      {
        heading: '2. Trying it out',
        body: [
          "You're welcome to sign up and explore everything. You may use a dummy account and made-up details to experience the whole app.",
        ],
      },
      {
        heading: '3. Play money only',
        body: [
          'Deposits in Sakura are simulated. No payment is needed: press "I\'ve paid" with the deposit amount and any 8 to 16 character reference and the deposit is accepted automatically.',
          "Balances and winnings are play money with no cash value. They can't be withdrawn, sold or exchanged for anything.",
        ],
      },
      {
        heading: '4. Donations',
        body: [
          "The QR code on the deposit page is a real GCash or Maya QR, shown only to demonstrate where a payment QR goes. Please don't scan it to get credits.",
          'If you like my work, you may send a donation through it. A donation is a gift to me: it never adds credits or anything else in the app.',
        ],
      },
      {
        heading: '5. Pragmatic Play games and assets',
        body: [
          "The slot games here are my own recreations, built with Pragmatic Play's assets and based on their games, so playing them feels like the real thing.",
          'I have no partnership with, sponsorship from or endorsement by Pragmatic Play. Their games, artwork, names and trademarks belong to them and are fully credited to them.',
        ],
      },
      {
        heading: '6. A work in progress',
        body: [
          'Sakura is provided as is while I test how things work. Features may change, break or be reset at any time.',
        ],
      },
      {
        heading: '7. Changes to these terms',
        body: ['I may update these terms as the project changes.'],
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    updated: 'October 21, 2026',
    intro:
      'Sakura is a personal portfolio project, not a real casino. This explains what happens to the information you enter when you become a member.',
    sections: [
      {
        heading: '1. What is kept',
        body: [
          'The details you enter, such as your phone number, name and personal details, and your activity in the app, such as deposits and game history.',
        ],
      },
      {
        heading: '2. Who can see it',
        body: [
          "Me, as the developer, and the services the app runs on: Google's Firebase stores your details and sends the sign-in text message.",
          'Your information is never sold, shared with anyone else or used for marketing.',
        ],
      },
      {
        heading: '3. Dummy details are highly encouraged',
        body: [
          "Sakura is a demo, so there's no need to give real information. Dummy details are highly encouraged for everything except your phone number, which has to receive the sign-in code.",
        ],
      },
      {
        heading: '4. Why it is kept',
        body: ['Only to make the app work and to test how it behaves.'],
      },
    ],
  },
}
