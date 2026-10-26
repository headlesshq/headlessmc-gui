<script setup lang="ts">
import { computed } from 'vue'
import { platformLogo, platformName } from '../lib/platforms'

// The logo of the platform (fabric, paper, vanilla, ...) a version runs on, or its initial if there is no logo.
const props = defineProps<{ platform: string | null | undefined; size?: number }>()
const src = computed(() => platformLogo(props.platform))
const name = computed(() => (props.platform ? platformName(props.platform) : 'Unknown platform'))
const px = computed(() => `${props.size ?? 20}px`)
</script>

<template>
  <img v-if="src" :src="src" :alt="name" :title="name" class="platform-logo" />
  <span v-else class="platform-logo placeholder" :title="name" aria-hidden="true">{{ name.charAt(0) }}</span>
</template>

<style scoped>
.platform-logo {
  width: v-bind(px);
  height: v-bind(px);
  flex: none;
  object-fit: contain;
  vertical-align: middle;
}

.placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: var(--bg-input);
  color: var(--fg-muted);
  font-size: calc(v-bind(px) * 0.6);
  font-weight: 700;
}
</style>
