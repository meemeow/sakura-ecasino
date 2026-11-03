<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import '@fontsource/oswald/700.css'
import '@fontsource/montserrat/800.css'
import GameControls from '@/games/shared/GameControls.vue'
import GameLoader from '@/games/shared/GameLoader.vue'
import BetMenu from '@/games/shared/BetMenu.vue'
import AnteBet from '@/games/gates-of-olympus/components/AnteBet.vue'
import AutoplaySettings from '@/games/gates-of-olympus/components/AutoplaySettings.vue'
import BigWin from '@/games/gates-of-olympus/components/BigWin.vue'
import BuyFeaturePopup from '@/games/gates-of-olympus/components/BuyFeaturePopup.vue'
import BuyFreeSpins from '@/games/gates-of-olympus/components/BuyFreeSpins.vue'
import CellSpine from '@/games/gates-of-olympus/components/CellSpine.vue'
import FreeSpinsPanel from '@/games/gates-of-olympus/components/FreeSpinsPanel.vue'
import FreeSpinsWindow from '@/games/gates-of-olympus/components/FreeSpinsWindow.vue'
import GameRules from '@/games/gates-of-olympus/components/GameRules.vue'
import MaxWinLabel from '@/games/gates-of-olympus/components/MaxWinLabel.vue'
import MultiplierLabel from '@/games/gates-of-olympus/components/MultiplierLabel.vue'
import OrbLanding from '@/games/gates-of-olympus/components/OrbLanding.vue'
import OrbWinEffects from '@/games/gates-of-olympus/components/OrbWinEffects.vue'
import SpeedToast from '@/games/gates-of-olympus/components/SpeedToast.vue'
import StageSpine from '@/games/gates-of-olympus/components/StageSpine.vue'
import StrikeEffects from '@/games/gates-of-olympus/components/StrikeEffects.vue'
import TopMessage from '@/games/gates-of-olympus/components/TopMessage.vue'
import TumbleNumber from '@/games/gates-of-olympus/components/TumbleNumber.vue'
import TumbleWinTitle from '@/games/gates-of-olympus/components/TumbleWinTitle.vue'
import WinEffects from '@/games/gates-of-olympus/components/WinEffects.vue'
import WinList from '@/games/gates-of-olympus/components/WinList.vue'
import ZeusSpine from '@/games/gates-of-olympus/components/ZeusSpine.vue'
import { useAutoplay } from '@/games/gates-of-olympus/composables/useAutoplay'
import { ANTE_STAKE_X, useBuyFeature } from '@/games/gates-of-olympus/composables/useBuyFeature'
import { useDemoCredit } from '@/games/gates-of-olympus/composables/useDemoCredit'
import { useFreeSpins } from '@/games/gates-of-olympus/composables/useFreeSpins'
import { useGameAudio } from '@/games/gates-of-olympus/composables/useGameAudio'
import { useGameLoading } from '@/games/gates-of-olympus/composables/useGameLoading'
import { useGameMenus } from '@/games/gates-of-olympus/composables/useGameMenus'
import { useMultiplierCollect } from '@/games/gates-of-olympus/composables/useMultiplierCollect'
import { useReels } from '@/games/gates-of-olympus/composables/useReels'
import { useScatterAnticipation } from '@/games/gates-of-olympus/composables/useScatterAnticipation'
import { useSpeedToast } from '@/games/gates-of-olympus/composables/useSpeedToast'
import { useSpinFlow } from '@/games/gates-of-olympus/composables/useSpinFlow'
import { useTopMessages } from '@/games/gates-of-olympus/composables/useTopMessages'
import { useTumbles } from '@/games/gates-of-olympus/composables/useTumbles'
import { useWinCounter } from '@/games/gates-of-olympus/composables/useWinCounter'
import { ASSET } from '@/games/gates-of-olympus/engine/assets'
import { FS_WINDOW, SCATTER_RIG, TRANSITION } from '@/games/gates-of-olympus/engine/freeSpins'
import { createGridEngine } from '@/games/gates-of-olympus/engine/grid'
import {
  artBox,
  labelOrigin,
  labelStyle,
  multTier,
  orbPlace,
  symArt,
  symbolPlace,
} from '@/games/gates-of-olympus/engine/symbols'
import { SYMBOL_RIGS } from '@/games/gates-of-olympus/engine/winFx'
import { formatPeso } from '@/utils/format'
import { publicUrl } from '@/utils/publicUrl'

const TUMBLE_PLATE = { scale: 640.63 / 596, titleBaseline: 28.3 }
const SLAM_IGNORE = 'button, a, input, .menu-layer, .backdrop, .band'

const engine = createGridEngine()
const bet = ref(5)
const ante = ref(false)
const speed = ref(0)
const playing = ref(false)
const stake = computed(() => (ante.value ? bet.value * ANTE_STAKE_X : bet.value))
const stageEl = ref<HTMLElement | null>(null)

const menus = useGameMenus()
const { modal, autoplayMenu, rulesOpen, betMenu, buyPopup, buyBlocking } = menus
const { music, volume, shownMuted } = useGameAudio()
const { loading, loadProgress } = useGameLoading(music.ready)
const credit = useDemoCredit(playing, buyBlocking)
const { shownCredit } = credit

const reels = useReels(engine)
const { zeus, cellLightEl, reelLayers, reelVars, cellVars, strikes } = reels
const { symbolWins, scatterFx, orbLandings, slamStop } = reels
const anticipation = useScatterAnticipation(reels)
const wins = useWinCounter(reels.sp, () => reels.spinSpeed.value > 0, stake)
const { tumbleWin, controlsWin, bigWin, stopBigWinCount, endBigWin } = wins
const freeSpins = useFreeSpins(bet)
const { freeMode, fsLeft, totalMult, pillarAt, pillarBump, bonusActive, notice } = freeSpins
const { fsWindow, transitionAt, transitionDim, onWindowClosing, onWindowDone } = freeSpins
const collect = useMultiplierCollect(stageEl, reels.grid, engine.newKey)
const { flyers, multShown, multSlot, multGhost, orbWins, winningCells, endOrbWin } = collect
const tumbles = useTumbles({ engine, reels, anticipation, wins, freeSpins, bet })
const { payLine, shownWinRows, winFx } = tumbles
const { topMessage, shownTopMessage } = useTopMessages(freeMode, tumbleWin)

const { maxed, finalPop, onSpin } = useSpinFlow({
  engine,
  reels,
  anticipation,
  wins,
  freeSpins,
  collect,
  tumbles,
  credit,
  menus,
  playing,
  speed,
  bet,
  ante,
  stake,
})
const { autoplay, skipScreens, autoCount, startAutoplay } = useAutoplay(
  menus,
  speed,
  controlsWin,
  () => onSpin(),
)
const { buyPrice, canBuy, antePrice, openBuy, answerBuy, buyClosed } = useBuyFeature({
  menus,
  credit,
  bet,
  ante,
  playing,
  autoplay,
  spinBought: () => void onSpin(true),
})

const speedToast = useSpeedToast(speed, autoplayMenu)
watch(speed, (value) => {
  if (!playing.value) return
  reels.spinSpeed.value = value
  if (!reels.sp.value.fxRate) wins.finishCounts()
  reels.retimeTo(reels.sp.value)
})

function onStageClick(e: MouseEvent) {
  const box = stageEl.value?.getBoundingClientRect()
  const inStage =
    !!box &&
    e.clientX >= box.left &&
    e.clientX <= box.right &&
    e.clientY >= box.top &&
    e.clientY <= box.bottom
  const onControl = e.composedPath().some((el) => el instanceof Element && el.matches(SLAM_IGNORE))
  if (e.button === 0 && inStage && !onControl) slamStop()
}

const router = useRouter()

function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/')
}
</script>

<template>
  <GameLoader
    v-if="loading"
    :progress="loadProgress"
    :logo="publicUrl('/providers/pragmatic-play.svg')"
    logo-alt="Pragmatic Play"
  />
  <div v-else class="game" @click="onStageClick">
    <div class="scenery">
      <img
        v-if="!freeMode"
        class="background"
        :src="`${ASSET}/background.webp`"
        alt=""
        draggable="false"
      />
      <img
        v-else
        class="background free"
        :src="`${ASSET}/free-background.webp`"
        alt=""
        draggable="false"
      />
    </div>

    <div ref="stageEl" class="stage">
      <ZeusSpine ref="zeus" :asset="ASSET" />
      <img
        class="ui board-shadow"
        :src="`${ASSET}/ui/board-shadow.webp`"
        alt=""
        draggable="false"
      />
      <img class="ui board-back" :src="`${ASSET}/ui/board-back.webp`" alt="" draggable="false" />

      <div
        v-for="layer in reelLayers"
        :key="layer.name"
        class="reels"
        :class="layer.state"
        :style="reelVars"
      >
        <div v-for="(col, c) in layer.cols" :key="c" class="reel">
          <div
            v-for="(sym, r) in col"
            :key="sym.key"
            class="cell"
            :data-cell="`${c}-${r}`"
            :class="{
              win: sym.win,
              orb: sym.mult,
              drop: sym.fall,
              'spine-win': layer.name === 'current' && symbolWins.has(sym.key),
              winning: layer.name === 'current' && winningCells.has(`${c}-${r}`),
            }"
            :style="cellVars(c, r, sym)"
          >
            <img
              v-if="symArt(sym)"
              class="sym"
              :src="`${ASSET}/reel/${sym.id}.webp`"
              :style="artBox(symArt(sym)!)"
              alt=""
              draggable="false"
            />
            <CellSpine
              v-if="layer.name === 'current' && symbolWins.has(sym.key)"
              :file="SYMBOL_RIGS[sym.id]!.file"
              :anim="SYMBOL_RIGS[sym.id]!.anim"
              :at="symbolWins.get(sym.key)!"
              :place="symbolPlace(sym.id)"
              :asset="ASSET"
            />
            <template
              v-if="sym.id === 'scatter' && layer.name === 'current' && scatterFx.has(sym.key)"
            >
              <CellSpine
                v-for="file in [SCATTER_RIG.bg, SCATTER_RIG.fg]"
                :key="file"
                :file="file"
                :anim="scatterFx.get(sym.key)!.anim"
                :at="scatterFx.get(sym.key)!.at"
                :rate="scatterFx.get(sym.key)!.rate"
                :hold="scatterFx.get(sym.key)!.hold"
                :swell="scatterFx.get(sym.key)!.swell"
                :place="SCATTER_RIG.place"
                :asset="ASSET"
                free
              />
            </template>
            <OrbLanding
              v-if="sym.mult && layer.name === 'current' && orbLandings.has(sym.key)"
              :rig="multTier(sym.mult).win.rig"
              :anim="multTier(sym.mult).land"
              :at="orbLandings.get(sym.key)!"
              :place="orbPlace(sym.mult)"
              :origin="labelOrigin(sym.mult)"
              :asset="ASSET"
              @done="orbLandings.delete(sym.key)"
            >
              <MultiplierLabel
                class="mult"
                :text="`${sym.mult}x`"
                :shadow="multTier(sym.mult).labelShadow"
                :style="labelStyle(sym.mult)"
              />
            </OrbLanding>
            <MultiplierLabel
              v-else-if="sym.mult && !sym.collected"
              class="mult"
              :text="`${sym.mult}x`"
              :shadow="multTier(sym.mult).labelShadow"
              :style="labelStyle(sym.mult)"
            />
          </div>
        </div>
      </div>
      <img class="ui board-front" :src="`${ASSET}/ui/board-front.webp`" alt="" draggable="false" />
      <div ref="cellLightEl" class="cell-light" />
      <StrikeEffects :strikes="strikes" :asset="ASSET" :shake="stageEl" />
      <OrbWinEffects :wins="orbWins" :asset="ASSET" @done="endOrbWin" />
      <WinEffects :fx="winFx" :asset="ASSET" />
      <div
        v-for="flyer in flyers"
        :key="flyer.key"
        :data-flyer="flyer.key"
        class="mult-fly"
        :style="{ '--mult-em': `${flyer.em}px` }"
      >
        <MultiplierLabel class="mult" :text="flyer.text" :shadow="flyer.shadow" />
      </div>
      <img
        class="ui logo"
        :src="`${ASSET}/ui/logo.webp`"
        alt="Gates of Olympus 1000"
        draggable="false"
      />

      <FreeSpinsPanel
        v-if="freeMode"
        :asset="ASSET"
        :total="totalMult"
        :left="fsLeft"
        :level-at="pillarAt"
        :bump-key="pillarBump"
      />
      <template v-else>
        <BuyFreeSpins
          :asset="ASSET"
          :price="buyPrice"
          :disabled="!canBuy || playing"
          :hidden="buyPopup"
          :active="bonusActive"
          @buy="openBuy"
        />
        <AnteBet v-model="ante" :asset="ASSET" :price="antePrice" :locked="bonusActive" />
      </template>

      <img
        class="ui history-back"
        :src="`${ASSET}/ui/history-back.webp`"
        alt=""
        draggable="false"
      />

      <WinList :rows="shownWinRows" :asset="ASSET" />
      <img
        class="ui history-frame"
        :src="`${ASSET}/ui/history-frame.webp`"
        alt=""
        draggable="false"
      />

      <Transition name="top-win">
        <div v-if="tumbleWin > 0" key="win" class="ui tumble-win">
          <img class="tumble-plate" :src="`${ASSET}/ui/tumble-win.webp`" alt="" draggable="false" />
          <TumbleWinTitle :scale="TUMBLE_PLATE.scale" :baseline="TUMBLE_PLATE.titleBaseline" />
          <span v-if="multGhost" class="tumble-amount split ghost" aria-hidden="true">
            <TumbleNumber :text="formatPeso(tumbleWin)" :asset="ASSET" />
            <TumbleNumber text="x" :asset="ASSET" />
            <TumbleNumber class="ta-mult" :text="String(multGhost)" :asset="ASSET" />
          </span>
          <span v-if="multShown || multSlot" key="split" class="tumble-amount split">
            <TumbleNumber class="ta-base" :text="formatPeso(tumbleWin)" :asset="ASSET" />
            <TumbleNumber class="ta-x" text="x" :asset="ASSET" />
            <TumbleNumber
              :key="multShown"
              class="ta-mult"
              :class="multShown ? 'bump' : 'reserved'"
              :text="String(multShown || multSlot)"
              :asset="ASSET"
            />
          </span>
          <span v-else key="plain" class="tumble-amount" :class="{ 'final-pop': finalPop }">
            <MaxWinLabel v-if="maxed" />
            <TumbleNumber :text="formatPeso(tumbleWin)" :asset="ASSET" />
          </span>
        </div>
        <div v-else key="info" class="top-info">
          <Transition name="top-swap">
            <TopMessage
              :key="topMessage"
              class="top-msg"
              :parts="shownTopMessage"
              :asset="ASSET"
              :scale="TUMBLE_PLATE.scale"
            />
          </Transition>
        </div>
      </Transition>

      <SpeedToast :show="speedToast" :speed="speed" />
    </div>

    <div v-if="autoplayMenu" class="stage menu-layer menu-in autoplay-in">
      <AutoplaySettings
        v-model:speed="speed"
        :count="autoCount"
        :skip-screens="skipScreens"
        @close="autoplayMenu = false"
        @start="startAutoplay"
      />
    </div>

    <div v-if="rulesOpen" class="stage menu-layer menu-in rules-in">
      <GameRules :bet="bet" @close="rulesOpen = false" />
    </div>

    <BuyFeaturePopup
      v-if="buyBlocking"
      :asset="ASSET"
      :price="buyPrice"
      @answer="answerBuy"
      @closed="buyClosed"
    />

    <div v-if="transitionDim" class="transition-dim" :style="{ opacity: FS_WINDOW.dim }" />
    <FreeSpinsWindow
      v-if="fsWindow"
      :key="fsWindow.at"
      :asset="ASSET"
      :kind="fsWindow.kind"
      :amount="fsWindow.amount"
      :spins="fsWindow.spins"
      :at="fsWindow.at"
      :wait-for-click="fsWindow.kind !== 'additional' && !autoplay"
      @closing="onWindowClosing"
      @done="onWindowDone"
    />
    <GameControls
      v-model:bet="bet"
      v-model:muted="shownMuted"
      v-model:volume="volume"
      v-model:autoplay="autoplay"
      v-model:speed="speed"
      @autoplay-menu="autoplayMenu = true"
      @bet-menu="betMenu = true"
      :credit="shownCredit"
      :stake="stake"
      :busy="playing"
      :bet-menu-open="betMenu"
      :win="controlsWin"
      :pay-line="payLine"
      :notice="notice"
      @spin="onSpin"
      @stop="slamStop"
      @info="rulesOpen = !rulesOpen"
      @sound-ready="music.play()"
      @volume-open="modal = null"
    />
    <BigWin
      v-if="bigWin"
      :asset="ASSET"
      :tier="bigWin.tier"
      :amount="bigWin.amount"
      :at="bigWin.at"
      :fast="bigWin.fast"
      @stop="stopBigWinCount"
      @done="endBigWin"
    />
    <div v-if="transitionAt" class="transition">
      <StageSpine
        :asset="ASSET"
        :file="TRANSITION.file"
        :anim="TRANSITION.anim"
        :at="transitionAt"
        :x="TRANSITION.x"
        :y="TRANSITION.y"
        :scale="TRANSITION.scale"
      />
    </div>
    <button type="button" class="back-btn" aria-label="Back to lobby" @click="goBack">
      <svg viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="10" />
        <path d="M15.5 11H6.5M10.5 7 6.5 11l4 4" />
      </svg>
    </button>
    <template v-if="betMenu">
      <div class="backdrop menu-layer" @click="betMenu = false" />
      <div class="stage menu-layer menu-in">
        <BetMenu v-model:bet="bet" :multiplier="ante ? 25 : 20" @close="betMenu = false" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.game {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #000;
  user-select: none;
  animation: fade-in 0.5s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

.backdrop {
  position: absolute;
  inset: 0;
}

.scenery,
.stage {
  position: absolute;
  inset: 0;
  margin: auto;
  width: min(100vw, 100vh * 16 / 9);
  height: min(100vh, 100vw * 9 / 16);
}

.scenery {
  pointer-events: none;
}

.background {
  position: absolute;
  left: -34.4513%;
  top: -37.1491%;
  width: 168.8672%;
  height: 141.7361%;
  max-width: none;
}

.stage {
  container-type: size;
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  pointer-events: none;
}

.menu-layer {
  z-index: 10;
}

.menu-in {
  transform-origin: 77.85% 43.81%;
  animation:
    fade-in 195ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
    menu-shrink 165ms cubic-bezier(0, 0, 0.58, 1);
}

.autoplay-in {
  transform-origin: 50.12% 44.45%;
  animation:
    fade-in 155ms cubic-bezier(0.42, 0, 1, 1),
    menu-shrink 125ms linear;
}

.rules-in {
  transform-origin: 50.12% 44.45%;
}

@keyframes menu-shrink {
  from {
    scale: 1.2;
  }
}

.ui {
  position: absolute;
  display: block;
}

.ui > img {
  display: block;
  width: 100%;
}

img.ui {
  height: auto;
}

.background.free {
  left: -26.1172%;
  top: -22.1961%;
  width: 152.8036%;
  height: 122.5496%;
}

.transition-dim {
  position: absolute;
  inset: 0;
  z-index: 8;
  background: #000;
  pointer-events: none;
}

.transition {
  position: absolute;
  inset: 0;
  z-index: 9;
  pointer-events: none;
}

.board-shadow {
  left: 14.386%;
  top: 6.957%;
  width: 71.171%;
}

.board-back {
  left: 15.456%;
  top: 9.009%;
  width: 69.032%;
}

.board-front {
  left: 13.063%;
  top: 4.905%;
  width: 73.874%;
}

.board-shadow,
.board-back,
.board-front,
.reels,
.cell-light,
.tumble-win {
  translate: calc(var(--shake-x, 0) * 1cqw / 19.2) calc(var(--shake-y, 0) * 1cqw / 19.2);
}

.tumble-win {
  left: 33.594%;
  top: 0;
  width: 32.8125%;
  aspect-ratio: 633 / 102;
  z-index: 4;
}

.ui > img.tumble-plate {
  position: absolute;
  left: -0.2594cqw;
  top: -0.2073cqw;
  width: 33.3661cqw;
  max-width: none;
}

.top-info {
  position: absolute;
  left: 0;
  right: 0;
  top: -1.6458cqw;
  display: grid;
  place-items: center;
  z-index: 4;
}

.top-msg {
  grid-area: 1 / 1;
  display: block;
}

.top-swap-enter-active,
.top-swap-leave-active {
  transition: opacity 1s linear;
}

.top-win-enter-active,
.top-win-leave-active {
  transition: opacity 0.25s linear;
}

.top-swap-enter-from,
.top-swap-leave-to,
.top-win-enter-from,
.top-win-leave-to {
  opacity: 0;
}

.mult-fly {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  z-index: 6;
  pointer-events: none;
}

.tumble-amount.split {
  gap: 0.28em;
}

.tumble-amount.ghost,
.ta-mult.reserved {
  visibility: hidden;
}

.ta-mult.bump {
  animation: amount-bump 190ms;
}

.tumble-amount.final-pop {
  animation: amount-final 240ms ease-in-out;
}

@keyframes amount-final {
  37% {
    scale: 1.47;
  }
}

@keyframes amount-bump {
  0% {
    animation-timing-function: ease-out;
  }
  37% {
    scale: 1.45;
    animation-timing-function: ease-in-out;
  }
}

.tumble-amount {
  position: absolute;
  left: 0;
  right: 0;
  top: 55%;
  translate: 0 -50%;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 2.15cqw;
  line-height: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.reels {
  position: absolute;
  left: 15.9375%;
  top: 10.141%;
  width: 68.07%;
  height: 76.014%;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  clip-path: inset(-0.673% 0);
  isolation: isolate;
}

.cell-light {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.reel {
  display: grid;
  grid-template-rows: repeat(5, minmax(0, 1fr));
  min-height: 0;
}

.cell {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
  overflow: visible;
}

.cell > .sym {
  position: absolute;
  max-width: none;
}

.cell.winning > .sym,
.cell:has(> .cell-spine.drawn) > .sym {
  visibility: hidden;
}

.mult {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
}

.reels.highlight .cell.win:not(.spine-win) {
  animation: win-pop var(--pop-ms) linear forwards;
}

@keyframes win-pop {
  16% {
    scale: 1.08;
  }
  26% {
    scale: 1.13;
  }
  34% {
    scale: 1.17;
  }
  56% {
    scale: 1.18;
  }
  66% {
    scale: 1.2;
  }
  76% {
    scale: 1.23;
  }
  90% {
    scale: 1.23;
  }
  92% {
    scale: 1.19;
  }
  94% {
    scale: 1.17;
  }
  96% {
    scale: 1.15;
  }
  98% {
    scale: 1.11;
  }
  100% {
    scale: 1;
  }
}

.reels.explode .cell.win {
  animation: win-vanish var(--vanish-ms) linear forwards;
}

@keyframes win-vanish {
  25% {
    opacity: 1;
  }
  37.6% {
    opacity: 0.88;
  }
  50% {
    opacity: 0.48;
  }
  58.4% {
    opacity: 0.42;
  }
  66.8% {
    opacity: 0.27;
  }
  75.2% {
    opacity: 0.19;
  }
  83.2% {
    opacity: 0.12;
  }
  91.6% {
    opacity: 0.06;
  }
  100% {
    opacity: 0;
  }
}

.reels.tumble .cell.drop {
  animation:
    fall var(--fall-ms) var(--fall-ease) var(--fall-delay) backwards,
    land var(--land-ms) calc(var(--fall-delay) + var(--fall-ms));
}

@keyframes fall {
  from {
    translate: 0 calc(var(--fall) * -100%);
  }
}

.reels.out .cell {
  animation: drop-out var(--out-ms) var(--out-ease) var(--odelay) forwards;
}

.reels.in .cell {
  animation:
    drop-in var(--in-ms) linear var(--delay) backwards,
    land var(--land-ms) calc(var(--delay) + var(--in-ms));
}

@keyframes drop-out {
  to {
    translate: 0 550%;
  }
}

@keyframes drop-in {
  from {
    translate: 0 -550%;
  }
}

@keyframes land {
  0% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0.3, 0.6, 0.5, 1);
  }
  40% {
    transform: translateY(12%);
    animation-timing-function: ease-in-out;
  }
  100% {
    transform: translateY(0);
  }
}

.logo {
  left: 85.208%;
  top: 7.037%;
  width: 14.792%;
}

.history-back {
  left: -0.253%;
  top: 56.166%;
  width: 15.372%;
}

.history-frame {
  left: 0.45%;
  top: 58.168%;
  width: 13.964%;
}

.back-btn {
  --px: calc(min(100vw, 100vh * 16 / 9) / 1689);
  position: absolute;
  z-index: 9;
  top: calc(24 * var(--px));
  left: calc(22 * var(--px));
  display: grid;
  place-items: center;
  width: calc(30 * var(--px));
  height: calc(30 * var(--px));
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.62);
  cursor: pointer;
}

.back-btn:hover {
  background: rgb(0 0 0 / 0.75);
}

.back-btn svg {
  width: calc(22 * var(--px));
  height: calc(22 * var(--px));
  fill: none;
  stroke: #fff;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
