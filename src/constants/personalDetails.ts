import type { PersonalDetails } from '@/types'

export const MIN_AGE = 21
export const MIN_BIRTH_YEAR = 1900

export const DISPLAY_NAME_MAX = 20
export const NAME_MAX = 60
export const EMAIL_MAX = 254
export const ADDRESS_MAX = 250
export const OCCUPATION_MAX = 100

export const SOURCES_OF_INCOME = [
  'Salary',
  'Business',
  'Savings',
  'Investments',
  'Remittance',
  'Pension',
  'Allowance',
  'Others',
]

export const REQUIRED_DETAILS: (keyof PersonalDetails)[] = [
  'firstName',
  'lastName',
  'birthdate',
  'nationality',
  'email',
  'occupation',
  'sourceOfIncome',
  'permanentAddress',
  'currentAddress',
]

export const IDENTITY_FIELDS: (keyof PersonalDetails)[] = [
  'firstName',
  'middleName',
  'lastName',
  'birthdate',
  'nationality',
]
