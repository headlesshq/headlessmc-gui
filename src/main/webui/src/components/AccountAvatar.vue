<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Account } from '../lib/types'

/**
 * A round avatar for an account: the player's head for Microsoft (default provider) accounts,
 * otherwise, or if the head fails to load, a colored circle with the account's initial.
 */
const props = defineProps<{ account: Account | null; size?: number }>()
const failed = ref(false)
watch(
  () => props.account?.uuid,
  () => (failed.value = false),
)

const src = computed(() =>
  props.account?.provider === 'default' ? `https://mc-heads.net/avatar/${encodeURIComponent(props.account.uuid)}/64` : null,
)
const name = computed(() => props.account?.name ?? '')
const initial = computed(() => (name.value.match(/[A-Za-z0-9]/)?.[0] ?? '?').toUpperCase())
const hue = computed(() => [...name.value].reduce((hash, c) => (hash * 31 + c.charCodeAt(0)) % 360, 7))
const px = computed(() => `${props.size ?? 32}px`)
const fontSize = computed(() => `${Math.round((props.size ?? 32) * 0.45)}px`)
</script>

<template>
  <img v-if="src && !failed" :src="src" :alt="name" class="avatar" @error="failed = true" />
  <div v-else-if="account" class="avatar placeholder" :style="{ background: `hsl(${hue} 35% 30%)` }" aria-hidden="true">
    {{ initial }}
  </div>
  <div v-else class="avatar placeholder empty" aria-hidden="true">?</div>
</template>

<style scoped>
.avatar {
  width: v-bind(px);
  height: v-bind(px);
  flex: none;
  border-radius: 50%;
  object-fit: cover;
  image-rendering: pixelated;
  background: var(--bg-input);
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: v-bind(fontSize);
  color: rgba(255, 255, 255, 0.85);
}

.empty {
  color: var(--fg-muted);
  border: 1px dashed var(--border);
}
</style>
