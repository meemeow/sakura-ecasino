// Copy for the Terms and Privacy dialogs. Sakura is a personal portfolio project, so these say
// so plainly; the original casino-style copy is kept commented out at the bottom for later.

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

// Original casino-style copy, kept for later:
//
// export const legalContent: Record<LegalDoc, LegalContent> = {
//   terms: {
//     title: 'Terms & Conditions',
//     updated: 'October 17, 2026',
//     intro:
//       'These Terms govern your use of Sakura. By creating an account or playing any game, you agree to them.',
//     sections: [
//       {
//         heading: '1. Eligibility',
//         body: [
//           'You must be at least 21 years old to use Sakura, as required by PAGCOR.',
//           'You are responsible for making sure online gaming is legal in your location.',
//         ],
//       },
//       {
//         heading: '2. Your account',
//         body: [
//           'Each player may hold one account. Keep your login details private; you are responsible for all activity on your account.',
//           'The details you give us must be accurate and your own. We may ask for identity documents before processing withdrawals.',
//         ],
//       },
//       {
//         heading: '3. Deposits and withdrawals',
//         body: [
//           'All balances are shown in Philippine pesos (₱). Minimum and maximum amounts are shown on the Wallet page.',
//           'Withdrawals are paid to a payment method in your own name. Processing times depend on the method you choose.',
//         ],
//       },
//       {
//         heading: '4. Bonuses and promotions',
//         body: [
//           'Each promotion has its own rules, including wagering requirements. Abuse of bonuses may lead to winnings being removed.',
//         ],
//       },
//       {
//         heading: '5. Fair play',
//         body: [
//           'Game outcomes are determined by a random number generator. Using bots, exploits or collusion is not allowed and may result in account closure.',
//         ],
//       },
//       {
//         heading: '6. Responsible gaming',
//         body: [
//           'Gambling should be entertainment, not a way to make money. You can set limits or request a self-exclusion at any time through Support.',
//         ],
//       },
//       {
//         heading: '7. Changes to these terms',
//         body: [
//           'We may update these Terms. We will let you know about significant changes before they take effect.',
//         ],
//       },
//     ],
//   },
//
//   privacy: {
//     title: 'Privacy Policy',
//     updated: 'October 17, 2026',
//     intro:
//       'This policy explains what personal information Sakura collects, why we collect it and how we keep it safe.',
//     sections: [
//       {
//         heading: '1. Information we collect',
//         body: [
//           'Account details: your name, email or phone number, date of birth and the personal details you provide.',
//           'Activity: deposits, withdrawals, bets and game history.',
//           'Technical data: device, browser and approximate location, used to keep your account secure.',
//         ],
//       },
//       {
//         heading: '2. How we use it',
//         body: [
//           'To run your account, process payments, verify your age and identity, prevent fraud and meet our legal obligations.',
//           'With your permission, to send you news about promotions. You can opt out at any time.',
//         ],
//       },
//       {
//         heading: '3. Sharing',
//         body: [
//           'We never sell your data. We share it only with payment providers, identity-verification services and authorities when the law requires it.',
//         ],
//       },
//       {
//         heading: '4. Security and storage',
//         body: [
//           'Your data is stored with industry-standard encryption. We keep it only as long as needed for the purposes above or as the law requires.',
//         ],
//       },
//       {
//         heading: '5. Your rights',
//         body: [
//           'You can ask to see, correct or delete your personal data, subject to legal record-keeping rules. Contact Support to make a request.',
//         ],
//       },
//     ],
//   },
// }
