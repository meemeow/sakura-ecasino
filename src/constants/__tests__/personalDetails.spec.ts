import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ADDRESS_MAX,
  DISPLAY_NAME_MAX,
  EMAIL_MAX,
  IDENTITY_FIELDS,
  MIN_AGE,
  MIN_BIRTH_YEAR,
  NAME_MAX,
  OCCUPATION_MAX,
  REQUIRED_DETAILS,
  SOURCES_OF_INCOME,
} from '@/constants/personalDetails'

const rules = readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8')

describe('personal details limits stay in sync with firestore.rules', () => {
  it('caps every text field at the same length', () => {
    expect(rules).toContain(`filled(d.displayName, ${DISPLAY_NAME_MAX})`)
    for (const field of ['firstName', 'lastName', 'nationality'])
      expect(rules).toContain(`filled(d.get('${field}', ''), ${NAME_MAX})`)
    for (const field of ['middleName', 'placeOfBirth'])
      expect(rules).toContain(`isText(d.get('${field}', ''), ${NAME_MAX})`)
    expect(rules).toContain(`filled(d.get('email', ''), ${EMAIL_MAX})`)
    expect(rules).toContain(`filled(d.get('occupation', ''), ${OCCUPATION_MAX})`)
    for (const field of ['permanentAddress', 'currentAddress'])
      expect(rules).toContain(`filled(d.get('${field}', ''), ${ADDRESS_MAX})`)
  })

  it('accepts the same sources of income', () => {
    const listed = rules.match(/'sourceOfIncome', ''\) in \[([^\]]+)\]/)![1]!
    expect(listed.match(/'[^']+'/g)!.map((s) => s.slice(1, -1))).toEqual(SOURCES_OF_INCOME)
  })

  it('locks the same identity fields once set', () => {
    for (const field of IDENTITY_FIELDS) expect(rules).toContain(`keepsIfSet('${field}')`)
    expect(rules.match(/keepsIfSet\('/g)).toHaveLength(IDENTITY_FIELDS.length)
  })

  it('checks the same minimum age and earliest year', () => {
    expect(rules).toContain(`int(b.split('-')[0]) + ${MIN_AGE}`)
    expect(rules).toContain(`int(b.split('-')[0]) >= ${MIN_BIRTH_YEAR}`)
  })

  it('requires every rules-required field in the client too', () => {
    for (const field of REQUIRED_DETAILS)
      expect(rules).toMatch(
        new RegExp(`filled\\(d.get\\('${field}'|d.get\\('${field}', ''\\) in \\[`),
      )
  })
})
