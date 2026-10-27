<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../lib/api'
import { quoteArg } from '../lib/shell'
import { run, waitForJob } from '../lib/store'
import type { Account } from '../lib/types'
import { useData } from '../lib/useData'
import AccountAvatar from './AccountAvatar.vue'

/** The selected account as a round avatar, opening a dropdown to switch between accounts or add another one. */
const router = useRouter()
const { data } = useData(() => api.accounts(), null)
const open = ref(false)
const switching = ref<Account | null>(null)
const root = ref<HTMLElement | null>(null)

const selected = computed(() => data.value?.selected ?? null)
const accounts = computed(() => data.value?.providers.flatMap((p) => p.accounts.map((a) => ({ ...a, provider: p.name }))) ?? [])
const isSelected = (account: Account) =>
  selected.value?.name === account.name && selected.value?.provider === account.provider

async function select(account: Account) {
  if (isSelected(account)) {
    open.value = false
    return
  }
  switching.value = account
  try {
    const job = await run(`account --provider ${quoteArg(account.provider)} select ${quoteArg(account.name)}`)
    await waitForJob(job.id)
    open.value = false
  } finally {
    switching.value = null
  }
}

function addAccount() {
  open.value = false
  router.push('/accounts')
}

function onPointerDown(event: PointerEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeyDown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div ref="root" class="account-menu">
    <button
      class="trigger"
      :title="selected ? selected.name : 'No account selected'"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <AccountAvatar :account="selected" :size="34" />
      <span class="trigger-name" :class="{ muted: !selected }">{{ selected ? selected.name : 'No account' }}</span>
    </button>
    <div v-if="open" class="dropdown" role="menu">
      <div class="heading muted">Accounts</div>
      <div v-if="!accounts.length" class="empty-list muted">No accounts yet.</div>
      <button
        v-for="account in accounts"
        :key="`${account.provider}/${account.uuid}/${account.name}`"
        class="item"
        :class="{ active: isSelected(account) }"
        role="menuitemradio"
        :aria-checked="isSelected(account)"
        :disabled="!!switching"
        @click="select(account)"
      >
        <AccountAvatar :account="account" :size="28" />
        <span class="details">
          <span class="name">{{ account.name }}</span>
          <span v-if="account.provider !== 'default'" class="provider muted">{{ account.provider }}</span>
        </span>
        <span v-if="switching === account" class="check muted">…</span>
        <span v-else-if="isSelected(account)" class="check">✓</span>
      </button>
      <div class="separator"></div>
      <button class="item add" role="menuitem" @click="addAccount">
        <span class="plus" aria-hidden="true">+</span>
        Add another account
      </button>
    </div>
  </div>
</template>

<style scoped>
.account-menu {
  position: relative;
}

.trigger {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.2rem 0.8rem 0.2rem 0.2rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: none;
  max-width: 16rem;
}

.trigger:hover:not(:disabled),
.trigger[aria-expanded='true'] {
  border-color: var(--border);
  background: var(--bg-elevated);
}

.trigger-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 0.4rem);
  z-index: 50;
  min-width: 16rem;
  max-width: calc(100vw - 2rem);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 0.3rem;
  display: flex;
  flex-direction: column;
}

.heading {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.3rem 0.5rem;
}

.empty-list {
  padding: 0.4rem 0.5rem;
}

.item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  padding: 0.4rem 0.5rem;
}

.item:hover:not(:disabled) {
  background: var(--bg-input);
}

.item.active .name {
  color: var(--accent);
}

.details {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider {
  font-size: 0.75rem;
}

.check {
  color: var(--accent);
}

.separator {
  height: 1px;
  background: var(--border);
  margin: 0.3rem 0;
}

.plus {
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 50%;
  border: 1px dashed var(--fg-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: var(--fg-muted);
}

.add:hover .plus {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
