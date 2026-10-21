<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import '@fontsource/noto-sans/500.css'
import '@fontsource/noto-sans/600.css'
import { BET_LEVELS } from '@/games/betLevels'
import { publicUrl } from '@/utils/publicUrl'
import { formatPeso } from '@/utils/format'

const props = defineProps<{ bet: number }>()
const emit = defineEmits<{ close: [] }>()

const ICONS = publicUrl('/slots/gates-of-olympus-1000/info')
const PAGES = 7
const page = ref(0)
const go = (d: number) => (page.value = (page.value + d + PAGES) % PAGES)

const money = (multiple: number) => formatPeso(props.bet * multiple)

type Pay = {
  icon: string
  box: [number, number, number, number]
  text: [number, number]
  pays: [number, number, number]
}
const PAYS: Pay[] = [
  { icon: 'crown', box: [165, 143, 105, 102], text: [147, 262], pays: [50, 25, 10] },
  { icon: 'hourglass', box: [415, 137, 103, 108], text: [398, 262], pays: [25, 10, 2.5] },
  { icon: 'ring', box: [663, 141, 98, 103], text: [643, 262], pays: [15, 5, 2] },
  { icon: 'chalice', box: [909, 141, 97, 102], text: [889, 262], pays: [12, 2, 1.5] },
  { icon: 'red', box: [133, 338, 94, 92], text: [112, 450], pays: [10, 1.5, 1] },
  { icon: 'purple', box: [341, 337, 87, 95], text: [316, 450], pays: [8, 1.2, 0.8] },
  { icon: 'yellow', box: [541, 343, 97, 83], text: [521, 450], pays: [5, 1, 0.5] },
  { icon: 'green', box: [750, 338, 89, 92], text: [731, 450], pays: [4, 0.9, 0.4] },
  { icon: 'blue', box: [955, 338, 88, 93], text: [936, 450], pays: [2, 0.75, 0.25] },
]
const SCATTER_PAYS: [number, number][] = [
  [6, 100],
  [5, 5],
  [4, 3],
]

const MULTIPLIERS: [string, [number, number, number, number]][] = [
  ['mgreen', [120, 295, 152, 110]],
  ['mblue', [323, 295, 153, 110]],
  ['mpurple', [526, 296, 152, 109]],
  ['mred', [730, 296, 152, 109]],
  ['mdiamond', [944, 293, 125, 114]],
]

const circle = (inner: string, fill = 'none') =>
  `<svg class="ico" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12.5" fill="${fill}" stroke="#fff" stroke-width="1.6"/>${inner}</svg>`
const I = {
  plus: circle('<path d="M8 14h12M14 8v12" stroke="#fff" stroke-width="1.8"/>'),
  minus: circle('<path d="M8 14h12" stroke="#fff" stroke-width="1.8"/>'),
  menu: circle('<path d="M8.5 10h11M8.5 14h11M8.5 18h11" stroke="#fff" stroke-width="1.6"/>'),
  speed: circle(
    '<path d="M7 18.5 10 9.5h2.4l-3 9zM11.6 18.5l3-9H17l-3 9zM16.2 18.5l3-9h2.4l-3 9z" fill="#fff"/>',
    '#2b2b2b',
  ),
  hyper: circle(
    '<path d="M6 17.5 8.5 10.5h9l-1 3h-3l-.5 1.5h3l-1 2.5zM15.5 17.5 18 10.5h2.2L17.7 17.5z" fill="#fff"/><text x="17" y="17.2" font-size="8" font-weight="700" fill="#fff" font-family="Noto Sans">H</text>',
    '#2b2b2b',
  ),
  info: circle(
    '<text x="14" y="19.5" text-anchor="middle" font-size="15" font-style="italic" font-weight="700" fill="#fff" font-family="Georgia, serif">i</text>',
  ),
  sound:
    '<svg class="ico" viewBox="0 0 28 28"><path d="M3.5 11h4.5l6-5v16l-6-5H3.5z" fill="#fff"/><path d="M17.5 10.5a5 5 0 0 1 0 7M20.5 8a8.5 8.5 0 0 1 0 12" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
  spin: '<svg class="ico" viewBox="0 0 100 100"><g fill="none" stroke="#fff" stroke-width="9"><path d="M76 35A30 30 0 0 0 21.6 46"/><path d="M24 65A30 30 0 0 0 78.4 54"/></g><g fill="#fff"><polygon points="32,47.5 11.2,44.5 19.9,58.3"/><polygon points="68,52.5 88.8,55.5 80.1,41.7"/></g></svg>',
  autoplay: '<span class="pill">AUTOPLAY</span>',
  volatility:
    '<svg class="ico" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="none" stroke="#f5b800" stroke-width="2.2"/><path d="M7 14c2-6 5-6 7 0s5 6 7 0" fill="none" stroke="#f5b800" stroke-width="2.2" stroke-linecap="round"/></svg>',
}
const NAV = {
  prev: '<svg viewBox="0 0 42 46"><path d="M5.5 20.6 34.6 3.3c2.4-1.4 5.4.3 5.4 3.1v33.2c0 2.8-3 4.5-5.4 3.1L5.5 25.4c-2.3-1.1-2.3-3.7 0-4.8z" fill="#60b700"/><path d="M34.6 3.3c2.4-1.4 5.4.3 5.4 3.1v33.2" fill="none" stroke="#dff2c7" stroke-width="1.3" stroke-opacity=".8"/></svg>',
  next: '<svg viewBox="0 0 42 46"><path d="M36.5 20.6 7.4 3.3C5 1.9 2 3.6 2 6.4v33.2c0 2.8 3 4.5 5.4 3.1l29.1-17.3c2.3-1.1 2.3-3.7 0-4.8z" fill="#60b700"/><path d="M7.4 3.3l29.1 17.3c1.2.6 1.7 1.5 1.7 2.4" fill="none" stroke="#dff2c7" stroke-width="1.3" stroke-opacity=".8"/></svg>',
  close:
    '<svg viewBox="0 0 48 48"><path d="M10 10 38 38M38 10 10 38" stroke="#60b700" stroke-width="12" stroke-linecap="round"/><path d="M34.5 6.8a4.8 4.8 0 0 1 6.7 6.7" fill="none" stroke="#dff2c7" stroke-width="1.3" stroke-opacity=".8"/></svg>',
}
const inlineNav = (svg: string) => svg.replace('<svg ', '<svg class="ico nav-ico" ')

type Block = [number, number, number, string] | [number, number, number, string, 'title']
const minBet = computed(() => formatPeso(BET_LEVELS[0]!))
const maxBet = computed(() => formatPeso(BET_LEVELS[BET_LEVELS.length - 1]!))

const TEXT = computed<Block[][]>(() => [
  [
    [39, 26, 24, 'GAME RULES', 'title'],
    [
      66,
      21,
      20,
      'Symbols pay anywhere on the screen. The total number of the same symbol on the screen at the<br>end of a spin determines the value of the win.',
    ],
  ],
  [
    [55, 26, 24, 'TUMBLE FEATURE', 'title'],
    [
      100,
      20.5,
      20,
      'The TUMBLE FEATURE means that after every spin, winning combinations are paid and all winning symbols<br>disappear. The remaining symbols fall to the bottom of the screen and the empty positions are replaced<br>with symbols coming from above.',
    ],
    [
      188,
      20.5,
      20,
      "Tumbling will continue until no more winning combinations appear as a result of a tumble. There's no limit to the<br>number of possible tumbles.",
    ],
    [
      247,
      21,
      20,
      "All wins are added to the player's balance after all of the tumbles resulted from a base spin have been played.",
    ],
    [
      440,
      28,
      20,
      'These are the multiplier symbols. They are present on all reels and can hit randomly during<br>spins and tumbles in both base game and FREE SPINS.',
    ],
    [
      516,
      23.2,
      20,
      'Whenever a MULTIPLIER symbol hits, it takes a random multiplier value from 2x to 1000x.<br>Possible values are: 2x, 3x, 4x, 5x, 6x, 8x, 10x, 12x, 15x, 20x, 25x, 50x, 100x, 250x, 500x or 1000x.<br>When the tumbling sequence ends, the values of all MULTIPLIER symbols on the screen are added<br>together and the total win of the sequence is multiplied by the final value.',
    ],
  ],
  [
    [86, 26, 24, 'FREE SPINS RULES', 'title'],
    [
      120,
      21,
      20,
      'The FREE SPINS FEATURE is awarded when 4 or more SCATTER symbols hit anywhere on the screen.<br>The round starts with 15 free spins.',
    ],
    [
      171,
      21,
      20,
      'During the FREE SPINS round, whenever a MULTIPLIER symbol hits and the spin results in a win, the MULTIPLIER<br>value gets added to the total multiplier. For the whole duration of the round, whenever any new MULTIPLIER symbol<br>hits and results in a win the total multiplier value is also used to multiply the win.',
    ],
    [
      243,
      21,
      20,
      'Whenever 3 or more SCATTER symbols hit during the FREE SPINS ROUND, 5 additional free spins are awarded.',
    ],
    [272, 21, 20, 'Special reels are in play during the FREE SPINS ROUND.'],
    [353, 26, 24, 'ANTE BET', 'title'],
    [
      385,
      21,
      20,
      'The player has the option to select the bet multiplier. Depending on the selected bet, the game behaves differently.<br>The possible values are:',
    ],
    [
      440,
      20.5,
      20,
      'Bet multiplier 25x - the chance to win free spins naturally is doubled. More SCATTER symbols are present on the reels.<br>The FREE SPINS PURCHASE FEATURE is disabled.<br>Bet multiplier 20x - gives the ability to purchase a FREE SPINS ROUND by paying a value equal to 100x total bet.',
    ],
    [524, 26, 24, 'BUY FREE SPINS', 'title'],
    [
      555,
      20.5,
      20,
      'The FREE SPINS ROUND can be instantly triggered from the base game by buying it for 100x current total bet.<br>When the 25x ante bet feature is enabled, the BUY FREE SPINS feature is disabled.',
    ],
    [
      602,
      20.5,
      20,
      'When buying the FREE SPINS feature 4 SCATTER symbols are guaranteed<br>to hit on the triggering spin.',
    ],
  ],
  [
    [63, 26, 24, 'GAME RULES', 'title'],
    [114, 22, 17, `${I.volatility} <b class="gold">HIGH</b> <b>VOLATILITY</b>`],
    [
      144,
      22,
      20,
      'High volatility games pay out less often on average but the chance to hit big wins in a short time span is higher.',
    ],
    [192, 22, 20, 'Symbols pay anywhere.'],
    [229, 22, 20, 'All wins are multiplied by base bet.'],
    [266, 22, 20, 'All values are expressed as actual wins in coins.'],
    [309, 22, 20, 'When winning with multiple symbols, all wins are added to the total win.'],
    [349, 22, 20, 'Free spins win is awarded to the player after the round completes.'],
    [401, 22, 20, 'Free spins total win in the history contains the whole win of the cycle.'],
    [
      444,
      22,
      20,
      'SPACE and ENTER buttons on the keyboard can be used to start and stop the spin.',
    ],
    [
      480,
      28.5,
      20,
      'The theoretical RTP of this game is 96.50%<br>The RTP of the game when using the "ANTE BET" is 96.50%<br>The RTP of the game when using "BUY FREE SPINS" is 96.49%',
    ],
    [563, 23, 20, `MINIMUM BET: ${minBet.value}<br>MAXIMUM BET: ${maxBet.value}`],
    [639, 22, 20, 'Malfunction voids all pays and plays.'],
  ],
  [
    [90, 28, 26, 'HOW TO PLAY', 'title'],
    [
      122,
      29,
      20,
      `Click the ${I.plus} or ${I.minus} buttons to change the bet value and open the bet menu.<br>Select the bet you want to use in the game.<br>Press the SPIN button to play.`,
    ],
    [225, 28, 26, 'MAIN GAME INTERFACE', 'title'],
    [
      255,
      22,
      20,
      `${I.menu} opens the SETTINGS menu that contains settings which affect the way the game is being played.`,
    ],
    [
      297,
      22,
      20,
      `${I.speed} - cycles through spin speed settings, normal speed, quick spin and turbo spin.`,
    ],
    [337, 22, 20, `${I.hyper} - starts the HYPERPLAY feature.`],
    [382, 22, 20, `${I.sound} toggles sound and music on and off`],
    [423, 22, 20, `${I.info} opens the Information page`],
    [
      470,
      20.5,
      20,
      'CREDIT and BET labels show the current balance and current total bet.<br>Click on the labels to switch between coins view and cash view.',
    ],
    [
      512,
      20.5,
      20,
      `${I.plus} and ${I.minus} change up or down the current bet and open the bet menu, where you can change the<br>bet denominations.`,
    ],
    [575, 22, 20, `${I.spin} starts the game`],
    [
      620,
      37,
      20,
      `${I.autoplay} opens the automatic play menu.<br>Click the ${I.autoplay} button again to stop it.`,
    ],
  ],
  [
    [99, 26, 24, 'SETTINGS MENU', 'title'],
    [
      168,
      41.3,
      20,
      'INTRO SCREEN – toggles the introductory screen on and off<br>AMBIENT – toggles the ambient sound and music in the game on and off<br>SOUND FX – toggles the game`s sound effects on and off<br>GAME HISTORY – opens the game history page',
    ],
    [357, 26, 24, 'INFORMATION SCREEN', 'title'],
    [
      388,
      22,
      20,
      `${inlineNav(NAV.prev)} and ${inlineNav(NAV.next)} scroll between information pages`,
    ],
    [432, 22, 20, `${inlineNav(NAV.close)} closes the information screen`],
    [491, 26, 24, 'BET MENU', 'title'],
    [
      527,
      22,
      20,
      'The bet menu shows the bet multiplier available in the game, and the current total bet in both coins and cash.',
    ],
    [
      568,
      22,
      20,
      `Use the ${I.plus} and ${I.minus} buttons in the BET and COIN VALUE fields to change the values.`,
    ],
    [
      618,
      22.5,
      20,
      'The maximum win amount is limited to 15000X bet. If the total win<br>of a round reaches 15000X bet the round immediately ends, win is<br>awarded up to the cap and all remaining features are forfeited.',
    ],
  ],
  [
    [93, 26, 24, 'AUTOPLAY', 'title'],
    [
      130,
      22,
      20,
      'Click on the buttons showing the number of possible auto-spins to start Autoplay',
    ],
    [
      171,
      22,
      20,
      'SKIP SCREENS option auto-skips the feature introduction and end screens after a short period of time',
    ],
  ],
])

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'ArrowRight') go(1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const box = ([x, y, w, h]: [number, number, number, number]) => ({
  left: `calc(${x} * var(--p))`,
  top: `calc(${y} * var(--p))`,
  width: `calc(${w} * var(--p))`,
  height: `calc(${h} * var(--p))`,
})
</script>

<template>
  <div class="rules" role="dialog" aria-modal="true" aria-label="Game information">
    <button type="button" class="x" aria-label="Close" @click="emit('close')">
      <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 8l24 24M32 8 8 32" /></svg>
    </button>

    <div
      v-for="([y, lh, fs, html, kind], i) in TEXT[page]"
      :key="`${page}-${i}`"
      class="line"
      :class="kind"
      :style="{
        top: `calc(${y - lh / 2} * var(--p))`,
        lineHeight: `calc(${lh} * var(--p))`,
        fontSize: `calc(${fs * 1.02} * var(--p))`,
      }"
      v-html="html"
    />

    <template v-if="page === 0">
      <template v-for="p in PAYS" :key="p.icon">
        <img class="icon" :src="`${ICONS}/${p.icon}.webp`" alt="" :style="box(p.box)" />
        <div
          class="pays"
          :style="{
            left: `calc(${p.text[0]} * var(--p))`,
            top: `calc(${p.text[1] - 10.5} * var(--p))`,
          }"
        >
          <div>12 - 30&nbsp;&nbsp;{{ money(p.pays[0]) }}</div>
          <div>10 - 11&nbsp;&nbsp;{{ money(p.pays[1]) }}</div>
          <div>8 - 9&nbsp;&nbsp;{{ money(p.pays[2]) }}</div>
        </div>
      </template>
      <div class="pays scatter-pays">
        <div v-for="[n, x] in SCATTER_PAYS" :key="n">{{ n }}&nbsp;&nbsp;{{ money(x) }}</div>
      </div>
      <img
        class="icon"
        :src="`${ICONS}/scatter.webp`"
        alt="Scatter"
        :style="box([410, 520, 169, 131])"
      />
      <div class="scatter-text">
        <div>This is the SCATTER symbol.</div>
        <div>SCATTER symbol is present on all reels.</div>
        <div>SCATTER pays on any position.</div>
      </div>
    </template>

    <template v-if="page === 1">
      <img
        v-for="[name, b] in MULTIPLIERS"
        :key="name"
        class="icon"
        :src="`${ICONS}/${name}.webp`"
        alt=""
        :style="box(b)"
      />
    </template>

    <nav class="nav">
      <button
        type="button"
        class="prev"
        aria-label="Previous page"
        @click="go(-1)"
        v-html="NAV.prev"
      />
      <button
        type="button"
        class="close"
        aria-label="Close"
        @click="emit('close')"
        v-html="NAV.close"
      />
      <button type="button" class="next" aria-label="Next page" @click="go(1)" v-html="NAV.next" />
    </nav>
    <div class="page">Page {{ page + 1 }}/{{ PAGES }}</div>
  </div>
</template>

<style scoped>
.rules {
  --p: calc(82.04cqw / 1180);
  position: absolute;
  left: 8.98%;
  top: 0.6%;
  width: calc(1180 * var(--p));
  height: calc(692 * var(--p));
  border-radius: calc(12 * var(--p));
  background: rgb(0 0 0 / 0.95);
  color: #fff;
  font-family: 'Noto Sans', sans-serif;
  font-weight: 500;
  line-height: 1;
  text-align: center;
  pointer-events: auto;
  overflow: hidden;
}

.line {
  position: absolute;
  left: 0;
  right: 0;
  white-space: nowrap;
  pointer-events: none;
}

.title {
  font-weight: 600;
}

.line :deep(b) {
  font-weight: 600;
}

.line :deep(.gold) {
  color: #f5b800;
}

.line :deep(.ico) {
  display: inline-block;
  width: calc(33 * var(--p));
  height: calc(33 * var(--p));
  vertical-align: middle;
  margin-top: calc(-4 * var(--p));
}

.line :deep(.nav-ico) {
  width: calc(28 * var(--p));
  height: calc(30 * var(--p));
}

.line :deep(.pill) {
  display: inline-block;
  padding: 0 calc(22 * var(--p));
  border: calc(1.6 * var(--p)) solid #fff;
  border-radius: calc(16 * var(--p));
  line-height: calc(29 * var(--p));
  font-size: calc(18 * var(--p));
}

.icon {
  position: absolute;
  display: block;
  object-fit: contain;
}

.pays {
  position: absolute;
  font-size: calc(20.4 * var(--p));
  line-height: calc(20 * var(--p));
  text-align: left;
  white-space: nowrap;
}

.scatter-pays {
  right: calc((1180 - 381) * var(--p));
  top: calc(556 * var(--p));
  text-align: right;
}

.scatter-text {
  position: absolute;
  left: calc(593 * var(--p));
  top: calc(541 * var(--p));
  font-size: calc(20 * var(--p));
  line-height: calc(30.5 * var(--p));
  text-align: left;
  white-space: nowrap;
}

.x {
  position: absolute;
  top: calc(1 * var(--p));
  right: calc(1 * var(--p));
  width: calc(67 * var(--p));
  height: calc(76 * var(--p));
  padding: 0;
  border: none;
  background: none;
  z-index: 1;
  cursor: pointer;
  outline: none;
}

.x svg {
  width: calc(47 * var(--p));
  height: calc(47 * var(--p));
  fill: none;
  stroke: #fff;
  stroke-width: 2.6;
}

.nav button {
  position: absolute;
  z-index: 1;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  outline: none;
}

.nav :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.prev {
  left: calc(51 * var(--p));
  top: calc(608 * var(--p));
  width: calc(46 * var(--p));
  height: calc(51.5 * var(--p));
}

.close {
  left: calc(107 * var(--p));
  top: calc(605 * var(--p));
  width: calc(56 * var(--p));
  height: calc(56 * var(--p));
}

.next {
  left: calc(173 * var(--p));
  top: calc(608 * var(--p));
  width: calc(46 * var(--p));
  height: calc(51.5 * var(--p));
}

.nav button,
.x {
  transition: transform 0.08s;
}

.nav button:active,
.x:active {
  transform: scale(0.92);
}

.page {
  position: absolute;
  right: calc(65 * var(--p));
  top: calc(624 * var(--p));
  font-size: calc(15 * var(--p));
  font-weight: 600;
}
</style>
