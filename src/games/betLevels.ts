// Total-bet steps (pesos), same as the original game's bet menu; shared by the controls,
// bet menu and rules screens.
export const BET_LEVELS = [
  0.2, 0.4, 0.8, 1, 3, 5, 7, 10, 20, 30, 50, 100, 200, 300, 500, 1000, 1500, 2000, 2500, 3000,
  3500, 4000, 4500, 5000,
]

export const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
