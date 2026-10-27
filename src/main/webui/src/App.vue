<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import AccountMenu from './components/AccountMenu.vue'
import ProgressPanel from './components/ProgressPanel.vue'
import PromptDialog from './components/PromptDialog.vue'
import { isDone, store } from './lib/store'

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/versions', label: 'Versions' },
  { to: '/profiles', label: 'Profiles' },
  { to: '/servers', label: 'Servers' },
  { to: '/mods', label: 'Mods' },
  { to: '/java', label: 'Java' },
  { to: '/config', label: 'Config' },
  { to: '/processes', label: 'Processes' },
  { to: '/commands', label: 'All commands' },
  { to: '/console', label: 'Console' },
]

const runningProcesses = computed(() => Object.values(store.processes).filter((p) => p.status === 'RUNNING').length)
const busyJob = computed(() => Object.values(store.jobs).find((job) => !isDone(job)))
</script>

<template>
  <div class="layout">
    <nav class="sidebar">
      <div class="brand"><img src="/favicon.svg" alt="" class="brand-logo" />HeadlessMc</div>
      <RouterLink v-for="item in nav" :key="item.to" :to="item.to" class="nav-link">
        {{ item.label }}
        <span v-if="item.to === '/processes' && runningProcesses" class="badge ok">{{ runningProcesses }}</span>
      </RouterLink>
      <div class="status">
        <div v-if="busyJob" class="busy mono" :title="busyJob.line">▶ {{ busyJob.line }}</div>
      </div>
    </nav>
    <main class="content">
      <header class="topbar">
        <AccountMenu />
      </header>
      <RouterView />
    </main>
    <PromptDialog />
    <ProgressPanel />
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 12rem 1fr;
  min-height: 100vh;
}

.sidebar {
  background: var(--bg-elevated);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 1rem 0.5rem;
  gap: 0.1rem;
  position: sticky;
  top: 0;
  height: 100vh;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.1rem;
  padding: 0 0.6rem 1rem;
  color: var(--accent);
}

.brand-logo {
  width: 28px;
  height: 28px;
}

.nav-link {
  color: var(--fg);
  text-decoration: none;
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-link:hover {
  background: var(--bg-input);
}

.nav-link.router-link-exact-active,
.nav-link.router-link-active:not([href='/']) {
  background: var(--bg-input);
  color: var(--accent);
}

.status {
  margin-top: auto;
  font-size: 0.8rem;
  padding: 0 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.busy {
  color: var(--info);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content {
  padding: 1rem 2rem 1.5rem;
  min-width: 0;
}

.topbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.25rem;
}

@media (max-width: 720px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
    height: auto;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .status {
    margin-top: 0;
  }

  .content {
    padding: 1rem;
  }
}
</style>
