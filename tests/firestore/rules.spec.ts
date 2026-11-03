import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { MAX_BALANCE, reloadBonusFor, turnoverAfterDeposit, turnoverFor } from '@/constants/wallet'
import { MIN_AGE } from '@/constants/personalDetails'

const ALICE = 'alice'
const BOB = 'bob'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-sakura',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

const as = (uid?: string) =>
  (uid
    ? env.authenticatedContext(uid)
    : env.unauthenticatedContext()
  ).firestore() as unknown as Firestore

const seed = (path: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore() as unknown as Firestore, path), data),
  )

const read = async (path: string) => {
  let data: Record<string, unknown> | undefined
  await env.withSecurityRulesDisabled(async (ctx) => {
    data = (await getDoc(doc(ctx.firestore() as unknown as Firestore, path))).data()
  })
  return data!
}

const isoDaysAgo = (years: number, days: number) => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

const details = (overrides: Record<string, unknown> = {}) => ({
  firstName: 'Alice',
  middleName: '',
  lastName: 'Reyes',
  birthdate: isoDaysAgo(MIN_AGE, 2),
  nationality: 'Filipino',
  placeOfBirth: 'Philippines',
  email: 'alice@example.com',
  occupation: 'Engineering',
  sourceOfIncome: 'Salary',
  permanentAddress: '1 Mabini St, Manila',
  currentAddress: '1 Mabini St, Manila',
  sameAsPermanent: true,
  consentedAt: serverTimestamp(),
  ...overrides,
})

describe('games', () => {
  it('are public to read and closed to writes', async () => {
    await seed('games/gates-of-olympus-1000', { name: 'Gates of Olympus 1000' })
    await assertSucceeds(getDoc(doc(as(), 'games/gates-of-olympus-1000')))
    await assertFails(setDoc(doc(as(ALICE), 'games/new-game'), { name: 'Mine' }))
  })
})

describe('profiles', () => {
  beforeEach(() => seed(`users/${ALICE}`, { displayName: 'Alice', balance: 100 }))

  it('are readable by their owner only', async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), `users/${ALICE}`)))
    await assertFails(getDoc(doc(as(BOB), `users/${ALICE}`)))
    await assertFails(getDoc(doc(as(), `users/${ALICE}`)))
  })

  it('let players create and rename their own profile', async () => {
    await assertSucceeds(setDoc(doc(as(BOB), `users/${BOB}`), { displayName: 'Bob' }))
    await assertSucceeds(updateDoc(doc(as(ALICE), `users/${ALICE}`), { displayName: 'Ally' }))
    await assertFails(setDoc(doc(as(BOB), `users/${ALICE}`), { displayName: 'Bob' }))
  })

  it('cap display names at 20 visible characters', async () => {
    const ref = doc(as(ALICE), `users/${ALICE}`)
    await assertSucceeds(updateDoc(ref, { displayName: 'x'.repeat(20) }))
    await assertFails(updateDoc(ref, { displayName: 'x'.repeat(21) }))
    await assertFails(updateDoc(ref, { displayName: '   ' }))
  })

  it('never let clients write money, totals or verification', async () => {
    const ref = doc(as(ALICE), `users/${ALICE}`)
    for (const field of ['balance', 'totalDeposit', 'totalBet', 'turnoverRemaining', 'verifiedAt'])
      await assertFails(
        updateDoc(ref, { [field]: field === 'verifiedAt' ? serverTimestamp() : 1e6 }),
      )
    await assertFails(setDoc(doc(as(BOB), `users/${BOB}`), { displayName: 'Bob', balance: 1e6 }))
  })

  it('cannot be deleted', async () => {
    await assertFails(deleteDoc(doc(as(ALICE), `users/${ALICE}`)))
  })
})

describe('personal details', () => {
  beforeEach(() => seed(`users/${ALICE}`, { displayName: 'Alice' }))
  const save = (data: Record<string, unknown>) =>
    setDoc(doc(as(ALICE), `users/${ALICE}`), data, { merge: true })

  it('accept a complete, consented set', async () => {
    await assertSucceeds(save(details()))
  })

  it.each([
    ['an under-21 birthdate', { birthdate: isoDaysAgo(MIN_AGE, -2) }],
    ['a birthdate before 1900', { birthdate: '1899-12-31' }],
    ['an impossible date', { birthdate: '2000-13-01' }],
    ['an unknown source of income', { sourceOfIncome: 'Lottery' }],
    ['a malformed email', { email: 'alice@example' }],
    ['a 61-character first name', { firstName: 'x'.repeat(61) }],
    ['a blank last name', { lastName: '  ' }],
    ['a 251-character address', { permanentAddress: 'x'.repeat(251) }],
    ['a client-side consent time', { consentedAt: Timestamp.now() }],
    ['an extra field', { vip: true }],
  ])('reject %s', async (_, overrides) => {
    await assertFails(save(details(overrides)))
  })

  it('lock identity fields once saved', async () => {
    await assertSucceeds(save(details()))
    await assertFails(save(details({ firstName: 'Alicia' })))
    await assertFails(save(details({ birthdate: isoDaysAgo(MIN_AGE + 5, 0) })))
    await assertSucceeds(save(details({ email: 'alice@sakura.example' })))
  })
})

describe('favorites', () => {
  const fav = (uid: string, gameId: string) => doc(as(uid), `users/${uid}/favorites/${gameId}`)

  it('hold only a server-stamped addedAt under a safe id', async () => {
    await assertSucceeds(
      setDoc(fav(ALICE, 'gates-of-olympus-1000'), { addedAt: serverTimestamp() }),
    )
    await assertFails(setDoc(fav(ALICE, 'Bad_ID'), { addedAt: serverTimestamp() }))
    await assertFails(setDoc(fav(ALICE, 'sweet-bonanza'), { addedAt: Timestamp.now() }))
    await assertFails(
      setDoc(fav(ALICE, 'sweet-bonanza'), { addedAt: serverTimestamp(), note: 'hi' }),
    )
  })

  it('belong to their owner and are never edited', async () => {
    await seed(`users/${ALICE}/favorites/sweet-bonanza`, { addedAt: Timestamp.now() })
    await assertFails(getDoc(doc(as(BOB), `users/${ALICE}/favorites/sweet-bonanza`)))
    await assertFails(
      setDoc(doc(as(BOB), `users/${ALICE}/favorites/x`), { addedAt: serverTimestamp() }),
    )
    await assertFails(updateDoc(fav(ALICE, 'sweet-bonanza'), { addedAt: serverTimestamp() }))
    await assertSucceeds(deleteDoc(fav(ALICE, 'sweet-bonanza')))
  })
})

describe('QR deposits', () => {
  const verified = (extra: Record<string, unknown> = {}) =>
    seed(`users/${ALICE}`, { displayName: 'Alice', verifiedAt: Timestamp.now(), ...extra })

  function openDeposit(amount: number, bonus: number, method = 'GCash', uid = ALICE) {
    const db = as(uid)
    const txRef = doc(collection(db, 'users', uid, 'transactions'))
    const batch = writeBatch(db)
    batch.set(txRef, {
      type: 'deposit',
      status: 'pending',
      amount,
      bonus,
      method,
      createdAt: serverTimestamp(),
    })
    batch.update(doc(db, 'users', uid), { pendingDepositId: txRef.id })
    return { id: txRef.id, commit: batch.commit() }
  }

  const submitProof = (id: string, sentAmount: number, reference = 'ABCD1234') =>
    updateDoc(doc(as(ALICE), `users/${ALICE}/transactions/${id}`), {
      sentAmount,
      reference,
      submittedAt: serverTimestamp(),
      approvedAt: serverTimestamp(),
    })

  function claim(id: string, { extra = 0 } = {}) {
    const db = as(ALICE)
    const userRef = doc(db, 'users', ALICE)
    const txRef = doc(db, 'users', ALICE, 'transactions', id)
    return runTransaction(db, async (t) => {
      const tx = (await t.get(txRef)).data()!
      const user = (await t.get(userRef)).data()!
      const bonus = user.lastReloadBonusAt ? 0 : tx.bonus
      t.update(txRef, { status: 'successful', creditedBonus: bonus })
      t.update(userRef, {
        balance: (user.balance ?? 0) + tx.amount + bonus + extra,
        totalDeposit: (user.totalDeposit ?? 0) + tx.amount,
        ...turnoverAfterDeposit(user, turnoverFor(tx.amount, bonus)),
        ...(bonus > 0 ? { lastReloadBonusAt: serverTimestamp() } : {}),
        ...(user.pendingDepositId === id ? { pendingDepositId: null } : {}),
        claimedDepositId: id,
      })
      if (bonus > 0)
        t.set(doc(db, 'users', ALICE, 'transactions', `${id}_bonus`), {
          type: 'bonus',
          status: 'successful',
          amount: bonus,
          method: 'Reload Bonus',
          createdAt: serverTimestamp(),
        })
    })
  }

  it('stay closed until the account is verified', async () => {
    await seed(`users/${ALICE}`, { displayName: 'Alice' })
    await assertFails(openDeposit(100, 0).commit)
  })

  it('open with the exact 30% reload bonus', async () => {
    await verified()
    await assertSucceeds(openDeposit(500, reloadBonusFor(500)).commit)
    expect((await read(`users/${ALICE}`)).pendingDepositId).toBeTruthy()
  })

  it.each([
    ['below ₱20', 19.99, 0, 'GCash'],
    ['above ₱50,000', 50_000.01, 0, 'GCash'],
    ['a fraction of a centavo', 100.005, 0, 'GCash'],
    ['an unknown method', 100, 0, 'PayPal'],
    ['an inflated bonus', 100, 31, 'GCash'],
    ['a float-rounded bonus', 20.15, 20.15 * 0.3, 'GCash'],
  ])('reject %s', async (_, amount, bonus, method) => {
    await verified()
    await assertFails(openDeposit(amount, bonus, method).commit)
  })

  it('need the pending pointer written in the same batch', async () => {
    await verified()
    const ref = doc(collection(as(ALICE), 'users', ALICE, 'transactions'))
    await assertFails(
      setDoc(ref, {
        type: 'deposit',
        status: 'pending',
        amount: 100,
        bonus: 0,
        method: 'GCash',
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('allow one open deposit at a time', async () => {
    await verified()
    await assertSucceeds(openDeposit(100, 0).commit)
    await assertFails(openDeposit(200, 0).commit)
  })

  it('refuse a deposit that would pass the balance cap', async () => {
    await verified({ balance: MAX_BALANCE - 50 })
    await assertFails(openDeposit(100, 0).commit)
    await assertSucceeds(openDeposit(50, 0).commit)
  })

  it('take proof only for the exact amount and a plain reference', async () => {
    await verified()
    const { id, commit } = openDeposit(100, 0)
    await commit
    await assertFails(submitProof(id, 99.99))
    await assertFails(submitProof(id, 100, 'ABC-1234'))
    await assertSucceeds(submitProof(id, 100))
  })

  it('credit an approved deposit and its bonus to the centavo, once', async () => {
    await verified({ balance: 10 })
    const amount = 123.45
    const bonus = reloadBonusFor(amount)
    const { id, commit } = openDeposit(amount, bonus)
    await commit
    await assertFails(claim(id))
    await submitProof(id, amount)
    await assertFails(claim(id, { extra: 0.01 }))
    await assertSucceeds(claim(id))

    const user = await read(`users/${ALICE}`)
    expect(user.balance).toBe(10 + amount + bonus)
    expect(user.totalDeposit).toBe(amount)
    expect(user.turnoverRemaining).toBe(turnoverFor(amount, bonus))
    expect(user.pendingDepositId).toBeNull()
    expect((await read(`users/${ALICE}/transactions/${id}_bonus`)).amount).toBe(bonus)

    await assertFails(claim(id))
  })

  it('give the reload bonus once per Philippine day', async () => {
    await verified({ lastReloadBonusAt: Timestamp.now() })
    await assertFails(openDeposit(100, reloadBonusFor(100)).commit)
    await assertSucceeds(openDeposit(100, 0).commit)
  })

  it('expire only after the payment window', async () => {
    await verified({ pendingDepositId: 'late' })
    const createdAt = (minutesAgo: number) => Timestamp.fromMillis(Date.now() - minutesAgo * 60_000)
    const pending = { type: 'deposit', status: 'pending', amount: 100, bonus: 0, method: 'GCash' }
    await seed(`users/${ALICE}/transactions/fresh`, { ...pending, createdAt: createdAt(1) })
    await seed(`users/${ALICE}/transactions/late`, { ...pending, createdAt: createdAt(11) })
    const expire = (id: string) =>
      updateDoc(doc(as(ALICE), `users/${ALICE}/transactions/${id}`), { status: 'expired' })
    await assertFails(expire('fresh'))
    await assertSucceeds(expire('late'))
  })

  it('keep transactions private and undeletable', async () => {
    await verified()
    const { id, commit } = openDeposit(100, 0)
    await commit
    await assertFails(getDoc(doc(as(BOB), `users/${ALICE}/transactions/${id}`)))
    await assertFails(deleteDoc(doc(as(ALICE), `users/${ALICE}/transactions/${id}`)))
  })
})
