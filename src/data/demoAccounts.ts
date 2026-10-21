export interface DemoAccount {
  phone: string
  code: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { phone: '09123456789', code: '123456' },
  { phone: '09987654321', code: '654321' },
  { phone: '09246808642', code: '246800' },
  { phone: '09135797531', code: '135790' },
]

export const demoCodeFor = (phone: string) =>
  DEMO_ACCOUNTS.find((account) => account.phone === phone)?.code

export const formatLocalPhone = (phone: string) =>
  `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`
