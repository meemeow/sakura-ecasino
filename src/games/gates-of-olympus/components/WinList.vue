<script setup lang="ts">
import '@fontsource/roboto/900.css'
import type { WinRow } from '@/games/gates-of-olympus/engine/symbols'
import { formatPeso } from '@/utils/format'

defineProps<{ rows: WinRow[]; asset: string }>()

const ROW_GAP_EM = 0.5

function fitRow(el: unknown) {
  if (!(el instanceof HTMLElement)) return
  shrinkToFit(el)
  void document.fonts.ready.then(() => el.isConnected && shrinkToFit(el))
}

function shrinkToFit(el: HTMLElement) {
  el.style.removeProperty('--fit')
  const style = getComputedStyle(el)
  const room = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const parts = [...el.children].map((child) => {
    const { marginLeft, marginRight } = getComputedStyle(child)
    const margins = child.classList.contains('win-amount') ? 0 : parseFloat(marginLeft)
    return child.getBoundingClientRect().width + margins + parseFloat(marginRight)
  })
  const need = parts.reduce((t, w) => t + w, 0) + parseFloat(style.fontSize) * ROW_GAP_EM
  if (need > room) el.style.setProperty('--fit', (room / need).toFixed(4))
}
</script>

<template>
  <TransitionGroup tag="div" name="win-row" class="win-list">
    <div
      v-for="(row, i) in rows"
      :key="row.key"
      :ref="fitRow"
      class="win-row"
      :class="{ max: row.max }"
      :style="{ '--slot': rows.length - 1 - i, '--delay': `${row.order * 120}ms` }"
    >
      <span v-if="row.max" class="win-max">MAX WIN</span>
      <template v-else>
        <span class="win-count">{{ row.count }}</span>
        <img class="win-icon" :src="`${asset}/reel/${row.id}.webp`" alt="" draggable="false" />
      </template>
      <span class="win-amount">{{ formatPeso(row.amount) }}</span>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.win-list {
  --row: 2.72cqw;
  --line: 0.052cqw;
  position: absolute;
  left: 1.25%;
  top: 59.54%;
  width: 12.5%;
  height: 23.15%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
}

.win-row {
  flex: none;
  display: flex;
  align-items: center;
  height: var(--row);
  padding: calc(var(--line) * 5) 0.5cqw var(--line) 0;
  box-sizing: border-box;
  white-space: nowrap;
  background:
    linear-gradient(
        #4f3f22 0 var(--line),
        #a68e23 0 calc(var(--line) * 2),
        #602517 0 calc(var(--line) * 3),
        #a68e23 0 calc(var(--line) * 4),
        #752c22 0 calc(var(--line) * 5),
        transparent 0 calc(100% - var(--line)),
        #3a1425 0
      )
      no-repeat,
    linear-gradient(
        90deg,
        rgb(0 0 0 / 0.42),
        rgb(0 0 0 / 0.12) 6%,
        transparent 12% 88%,
        rgb(0 0 0 / 0.12) 94%,
        rgb(0 0 0 / 0.42)
      )
      no-repeat,
    linear-gradient(
      #5c4c4d,
      #574446 8%,
      #513237 19%,
      #47262b 30%,
      #472326 38%,
      #4d272b 50%,
      #552c2f 62%,
      #593032 78%
    );
  font-family: 'Roboto', sans-serif;
  font-weight: 900;
  font-size: calc(1.41cqw * var(--fit, 1));
  line-height: 1;
}

.win-row.max {
  padding-left: 0.42cqw;
  background:
    linear-gradient(#695b1e 0 var(--line), #a46c23 0 calc(var(--line) * 2), transparent 0) no-repeat,
    linear-gradient(
      #d01000,
      #c20500 8%,
      #b20305 18%,
      #a50401 28%,
      #9c0400 42%,
      #a40401 55%,
      #b30900 72%,
      #bb0b00 85%,
      #a00500
    );
  font-size: calc(1.24cqw * var(--fit, 1));
}

.win-count {
  width: 1.6em;
  text-align: right;
}

.win-icon {
  width: 1.06em;
  height: 1.06em;
  margin-left: 0.17em;
  object-fit: contain;
}

.win-max,
.win-amount {
  margin-left: auto;
}

.win-max {
  margin: 0;
}

.win-max,
.win-count,
.win-amount {
  background: linear-gradient(
    #c89d4f 15%,
    #f0daa2 33%,
    #fff1c1 42%,
    #ffe9a4 50%,
    #fadc8f 56%,
    #e3bd68 65%,
    #c8973c 75%,
    #bd8829 86%
  );
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 0.05cqw rgb(60 6 4 / 0.95))
    drop-shadow(0 0.07cqw 0.08cqw rgb(0 0 0 / 0.55));
}

.win-row-enter-active {
  animation: win-row-drop 0.27s linear var(--delay, 0s) backwards;
}

@keyframes win-row-drop {
  0% {
    translate: 0 calc((13.02cqw - var(--row) - var(--slot) * var(--row)) * -1);
    animation-timing-function: cubic-bezier(0.4, 0, 0.9, 0.6);
  }
  38% {
    translate: 0 0;
    animation-timing-function: cubic-bezier(0.2, 0.6, 0.4, 1);
  }
  54% {
    translate: 0 -0.75cqw;
  }
  62% {
    translate: 0 -0.75cqw;
    animation-timing-function: ease-in-out;
  }
  100% {
    translate: 0 0;
  }
}

.win-row-move {
  transition: transform 0.2s ease-out;
}

.win-row-leave-active {
  animation: win-row-fall 0.32s cubic-bezier(0.55, 0, 1, 0.45) forwards;
}

@keyframes win-row-fall {
  to {
    translate: 0 13.5cqw;
  }
}
</style>
