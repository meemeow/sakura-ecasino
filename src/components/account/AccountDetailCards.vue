<script setup lang="ts">
import { computed } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import type { PersonalDetails } from '@/types'

const props = defineProps<{ revealed: boolean }>()

const wallet = useWalletStore()

function maskEmail(email: string) {
  const [user = '', domain = ''] = email.split('@')
  return `${user.slice(0, 2)}•••@${domain}`
}
function formatBirthdate(iso: string) {
  const [y, m, d] = iso.split('-')
  return props.revealed ? `${m}/${d}/${y}` : `••/••/${y}`
}
function maskAddress(address: string) {
  const parts = address.split(',').map((p) => p.trim())
  return parts.length > 1 ? `•••, ${parts.at(-1)}` : '••••••'
}

interface DetailRow {
  label: string
  icon: string
  value: string
  locked?: boolean
  missing?: boolean
}

const detailRows = computed<DetailRow[]>(() => {
  const p: Partial<PersonalDetails> = wallet.profile ?? {}
  const show = (value: string | undefined, mask: (v: string) => string) =>
    value ? (props.revealed ? value : mask(value)) : ''
  const name = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')
  const current = p.sameAsPermanent ? 'Same as permanent address' : p.currentAddress
  return [
    {
      label: 'Full Name',
      icon: 'pi-user',
      value: name,
      locked: !!p.firstName,
      missing: !p.firstName || !p.lastName,
    },
    {
      label: 'Birthdate',
      icon: 'pi-calendar',
      value: p.birthdate ? formatBirthdate(p.birthdate) : '',
      locked: !!p.birthdate,
      missing: !p.birthdate,
    },
    {
      label: 'Nationality',
      icon: 'pi-flag',
      value: p.nationality ?? '',
      locked: !!p.nationality,
      missing: !p.nationality,
    },
    { label: 'Place of Birth', icon: 'pi-map-marker', value: p.placeOfBirth ?? '' },
    { label: 'Email', icon: 'pi-envelope', value: show(p.email, maskEmail), missing: !p.email },
    {
      label: 'Occupation',
      icon: 'pi-briefcase',
      value: p.occupation ?? '',
      missing: !p.occupation,
    },
    {
      label: 'Source of Income',
      icon: 'pi-wallet',
      value: p.sourceOfIncome ?? '',
      missing: !p.sourceOfIncome,
    },
    {
      label: 'Permanent Address',
      icon: 'pi-home',
      value: show(p.permanentAddress, maskAddress),
      missing: !p.permanentAddress,
    },
    {
      label: 'Current Address',
      icon: 'pi-map',
      value: p.sameAsPermanent ? (current ?? '') : show(current, maskAddress),
      missing: !current,
    },
  ]
})
</script>

<template>
  <ul class="detail-cards">
    <li
      v-for="row in detailRows"
      :key="row.label"
      class="detail-card"
      :class="{ missing: !row.value && row.missing, empty: !row.value }"
    >
      <span class="detail-icon"><i class="pi" :class="row.icon" /></span>
      <div class="detail-text">
        <p class="detail-label">
          {{ row.label }}
          <i
            v-if="row.locked"
            class="pi pi-lock"
            title="Can't be changed once saved"
            aria-label="Locked"
          />
        </p>
        <p v-if="row.value" class="detail-value">{{ row.value }}</p>
        <p v-else-if="row.missing" class="detail-value required">Required</p>
        <p v-else class="detail-value unset">Not set</p>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.detail-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.detail-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
}

:root:not(.app-dark) .detail-card {
  box-shadow: 0 2px 8px rgb(27 37 80 / 0.05);
}

.detail-card.missing {
  border: 1.5px dashed rgb(255 194 0 / 0.45);
}

:root:not(.app-dark) .detail-card.missing {
  border-color: rgb(224 69 127 / 0.45);
}

.detail-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgb(255 194 0 / 0.12);
  color: #ffc200;
}

:root:not(.app-dark) .detail-icon {
  background: #ffe9f1;
  color: #e0457f;
}

.detail-card.empty .detail-icon {
  background: rgb(128 140 175 / 0.12);
  color: var(--app-muted);
}

.detail-icon .pi {
  font-size: 1rem;
}

.detail-text {
  min-width: 0;
}

.detail-label {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0 0 2px;
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.72rem;
}

.detail-label .pi {
  font-size: 0.62rem;
  opacity: 0.8;
}

.detail-value {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--app-text);
  font-weight: 700;
  font-size: 0.88rem;
}

.detail-value.unset {
  color: var(--app-muted);
  font-weight: 500;
}

.detail-value.required {
  color: var(--app-gold-text);
}

:root:not(.app-dark) .detail-value.required {
  color: #e0457f;
}

@container (max-width: 820px) {
  .detail-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container (max-width: 480px) {
  .detail-cards {
    grid-template-columns: 1fr;
  }
}
</style>
