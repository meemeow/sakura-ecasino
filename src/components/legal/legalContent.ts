// Placeholder legal copy for the Terms and Privacy dialogs.
// MOCKUP ONLY: replace with text reviewed by a lawyer before launch.

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
    updated: 'October 17, 2026',
    intro:
      'These Terms govern your use of Sakura. By creating an account or playing any game, you agree to them.',
    sections: [
      {
        heading: '1. Eligibility',
        body: [
          'You must be at least 21 years old to use Sakura, as required by PAGCOR.',
          'You are responsible for making sure online gaming is legal in your location.',
        ],
      },
      {
        heading: '2. Your account',
        body: [
          'Each player may hold one account. Keep your login details private; you are responsible for all activity on your account.',
          'The details you give us must be accurate and your own. We may ask for identity documents before processing withdrawals.',
        ],
      },
      {
        heading: '3. Deposits and withdrawals',
        body: [
          'All balances are shown in Philippine pesos (₱). Minimum and maximum amounts are shown on the Wallet page.',
          'Withdrawals are paid to a payment method in your own name. Processing times depend on the method you choose.',
        ],
      },
      {
        heading: '4. Bonuses and promotions',
        body: [
          'Each promotion has its own rules, including wagering requirements. Abuse of bonuses may lead to winnings being removed.',
        ],
      },
      {
        heading: '5. Fair play',
        body: [
          'Game outcomes are determined by a random number generator. Using bots, exploits or collusion is not allowed and may result in account closure.',
        ],
      },
      {
        heading: '6. Responsible gaming',
        body: [
          'Gambling should be entertainment, not a way to make money. You can set limits or request a self-exclusion at any time through Support.',
        ],
      },
      {
        heading: '7. Changes to these terms',
        body: [
          'We may update these Terms. We will let you know about significant changes before they take effect.',
        ],
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    updated: 'October 17, 2026',
    intro:
      'This policy explains what personal information Sakura collects, why we collect it and how we keep it safe.',
    sections: [
      {
        heading: '1. Information we collect',
        body: [
          'Account details: your name, email or phone number, date of birth and the personal details you provide.',
          'Activity: deposits, withdrawals, bets and game history.',
          'Technical data: device, browser and approximate location, used to keep your account secure.',
        ],
      },
      {
        heading: '2. How we use it',
        body: [
          'To run your account, process payments, verify your age and identity, prevent fraud and meet our legal obligations.',
          'With your permission, to send you news about promotions. You can opt out at any time.',
        ],
      },
      {
        heading: '3. Sharing',
        body: [
          'We never sell your data. We share it only with payment providers, identity-verification services and authorities when the law requires it.',
        ],
      },
      {
        heading: '4. Security and storage',
        body: [
          'Your data is stored with industry-standard encryption. We keep it only as long as needed for the purposes above or as the law requires.',
        ],
      },
      {
        heading: '5. Your rights',
        body: [
          'You can ask to see, correct or delete your personal data, subject to legal record-keeping rules. Contact Support to make a request.',
        ],
      },
    ],
  },
}
