<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { api } from '../lib/api'
import { groupSettings, isBoolean, type SettingSort } from '../lib/settings'
import { quoteArg } from '../lib/shell'
import { run, waitForJob } from '../lib/store'
import type { ConfigProperty } from '../lib/types'
import { useData } from '../lib/useData'

/** HeadlessMc's config properties, grouped by their names, with a group navigation on the left. */
const emit = defineEmits<{ close: [] }>()

const showAll = ref(false)
const temporary = ref(false)
const filter = ref('')
const { data, error, loading, reload } = useData(() => api.config(showAll.value), [])
const edits = reactive<Record<string, string>>({})
const saving = reactive<Record<string, boolean>>({})
const failures = reactive<Record<string, string>>({})
const activeGroup = ref('')
const pane = ref<HTMLElement | null>(null)
const search = ref<HTMLInputElement | null>(null)
const flashGroup = ref<string | null>(null)
const spacer = ref(0)
const sort = ref<SettingSort>(loadSort())
let jumpTarget: { id: string; top: number } | null = null
let jumpTimer: ReturnType<typeof setTimeout> | undefined

const groups = computed(() => {
  const query = filter.value.trim().toLowerCase()
  return groupSettings(
    data.value.filter(
      (property) =>
        !query || property.name.toLowerCase().includes(query) || (property.description ?? '').toLowerCase().includes(query),
    ),
    sort.value,
  )
})

watch(groups, async (value) => {
  if (!value.some((group) => group.id === activeGroup.value)) activeGroup.value = value[0]?.id ?? ''
  await nextTick()
  updateSpacer()
  updateActiveGroup()
})

watch(sort, (value) => {
  try {
    localStorage.setItem('settings.sort', value)
  } catch {
    // the sort order just is not remembered
  }
})

function loadSort(): SettingSort {
  try {
    return localStorage.getItem('settings.sort') === 'alphabetical' ? 'alphabetical' : 'priority'
  } catch {
    return 'priority'
  }
}

function toggleSort() {
  sort.value = sort.value === 'priority' ? 'alphabetical' : 'priority'
}

async function save(property: ConfigProperty, value: string) {
  saving[property.name] = true
  delete failures[property.name]
  try {
    const job = await run(`config set ${temporary.value ? '--temp ' : ''}${quoteArg(property.name)} ${quoteArg(value)}`)
    const done = await waitForJob(job.id)
    if (done.status === 'SUCCEEDED') {
      property.value = value
      delete edits[property.name]
    } else {
      failures[property.name] = done.output?.trim() || 'Failed to save this setting.'
    }
  } catch (e) {
    failures[property.name] = e instanceof Error ? e.message : String(e)
  } finally {
    delete saving[property.name]
  }
}

function toggleAll() {
  showAll.value = !showAll.value
  reload()
}

function scrollToGroup(id: string) {
  const section = pane.value?.querySelector<HTMLElement>(`[data-group="${id}"]`)
  if (!pane.value || !section) return
  activeGroup.value = id
  clearTimeout(jumpTimer)
  if (Math.abs(pane.value.scrollTop - section.offsetTop) <= 2) {
    jumpTarget = null
    flash(id)
    return
  }
  jumpTarget = { id, top: section.offsetTop }
  jumpTimer = setTimeout(() => endJump(true), 2000)
  pane.value.scrollTo({ top: section.offsetTop, behavior: 'smooth' })
}

/** Ends scrolling to a group, highlighting it if it was reached. */
function endJump(reached = false) {
  if (reached && jumpTarget) flash(jumpTarget.id)
  jumpTarget = null
  clearTimeout(jumpTimer)
}

async function flash(id: string) {
  flashGroup.value = null
  await nextTick()
  flashGroup.value = id
}

/** Leaves enough room below the last group for it to be scrolled to the top. */
function updateSpacer() {
  const el = pane.value
  const sections = el?.querySelectorAll<HTMLElement>('[data-group]')
  const last = sections?.[sections.length - 1]
  spacer.value = el && last ? Math.max(0, el.clientHeight - last.offsetHeight) : 0
}

function updateActiveGroup() {
  const el = pane.value
  if (!el) return
  if (jumpTarget !== null) {
    if (Math.abs(el.scrollTop - jumpTarget.top) <= 2) endJump(true)
    return
  }
  const sections = [...el.querySelectorAll<HTMLElement>('[data-group]')]
  if (!sections.length) return
  let current = sections[0]
  for (const section of sections) {
    if (section.offsetTop <= el.scrollTop + 24) current = section
  }
  activeGroup.value = current.dataset.group!
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', updateSpacer)
  search.value?.focus()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', updateSpacer)
  endJump()
})
</script>

<template>
  <div class="overlay" @mousedown.self="emit('close')">
    <div class="settings" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <button class="close" title="Close" aria-label="Close settings" @click="emit('close')">×</button>
      <aside class="groups">
        <h2 id="settings-title">Settings</h2>
        <div class="search-row">
          <input ref="search" v-model="filter" class="search" type="search" placeholder="Search settings…" />
          <button
            class="sort"
            :aria-label="sort === 'priority' ? 'Sorted by importance' : 'Sorted alphabetically'"
            :title="sort === 'priority' ? 'Sorted by importance, click to sort alphabetically' : 'Sorted alphabetically, click to sort by importance'"
            @click="toggleSort"
          >
            <span class="sort-icon" :class="sort" aria-hidden="true"></span>
          </button>
        </div>
        <nav class="group-list">
          <button
            v-for="group in groups"
            :key="group.id"
            class="group-link"
            :class="{ active: group.id === activeGroup }"
            @click="scrollToGroup(group.id)"
          >
            {{ group.title }}
          </button>
        </nav>
        <div class="options">
          <label class="option"><input v-model="temporary" type="checkbox" /> Only until restart</label>
          <label class="option"><input type="checkbox" :checked="showAll" @change="toggleAll" /> Show all properties</label>
        </div>
      </aside>
      <div class="main">
        <div ref="pane" class="pane" @scroll.passive="updateActiveGroup" @wheel.passive="endJump()" @touchstart.passive="endJump()">
          <div v-if="error" class="error">{{ error }}</div>
          <div v-else-if="loading && !data.length" class="muted empty">Loading settings…</div>
          <div v-else-if="!groups.length" class="muted empty">No settings match “{{ filter }}”.</div>
          <section
            v-for="group in groups"
            :key="group.id"
            :data-group="group.id"
            class="group"
            :class="{ flash: flashGroup === group.id }"
            @animationend="flashGroup = null"
          >
            <h3>{{ group.title }}</h3>
            <div v-for="section in group.sections" :key="section.title" class="section">
              <h4 v-if="section.title">{{ section.title }}</h4>
              <div v-for="{ property, label } in section.settings" :key="property.name" class="setting">
                <div class="text">
                  <div class="label">{{ label }}</div>
                  <div v-if="property.description" class="description">{{ property.description }}</div>
                  <div class="name mono">{{ property.name }}</div>
                  <div v-if="failures[property.name]" class="error failure">{{ failures[property.name] }}</div>
                </div>
                <div class="control">
                  <label v-if="isBoolean(property) && edits[property.name] === undefined" class="switch">
                    <input
                      type="checkbox"
                      role="switch"
                      :checked="property.value === 'true'"
                      :disabled="saving[property.name]"
                      :aria-label="label"
                      @change="save(property, String(($event.target as HTMLInputElement).checked))"
                    />
                    <span class="track"><span class="thumb"></span></span>
                  </label>
                  <form v-else class="value" @submit.prevent="save(property, edits[property.name] ?? property.value ?? '')">
                    <input
                      :value="edits[property.name] ?? property.value ?? ''"
                      class="mono"
                      :aria-label="label"
                      :disabled="saving[property.name]"
                      placeholder="not set"
                      @input="edits[property.name] = ($event.target as HTMLInputElement).value"
                      @keydown.esc.stop="delete edits[property.name]"
                    />
                    <div v-if="edits[property.name] !== undefined" class="row buttons">
                      <button class="small" type="button" @click="delete edits[property.name]">Reset</button>
                      <button class="small primary" type="submit" :disabled="saving[property.name]">
                        {{ saving[property.name] ? 'Saving…' : 'Save' }}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </section>
          <div :style="{ height: `${spacer}px` }" aria-hidden="true"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 80;
}

.settings {
  width: min(60rem, 100%);
  height: min(44rem, 100%);
  display: grid;
  grid-template-columns: 14rem 1fr;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  position: relative;
}

.groups {
  background: var(--bg-elevated);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 1rem 0.6rem;
  min-height: 0;
}

h2 {
  margin: 0 0.5rem 0.75rem;
}

.search-row {
  display: flex;
  gap: 0.4rem;
  margin: 0 0.1rem 0.75rem;
}

.search {
  flex: 1;
  min-width: 0;
}

.sort {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 2.1rem;
  padding: 0;
  color: var(--fg-muted);
}

.sort:hover:not(:disabled) {
  color: var(--fg);
}

.sort-icon {
  width: 18px;
  height: 18px;
  background-color: currentColor;
  mask: url('../assets/icons/sort-priority.svg') center / contain no-repeat;
}

.sort-icon.alphabetical {
  mask-image: url('../assets/icons/sort-alpha.svg');
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  overflow-y: auto;
  min-height: 0;
  flex: 1;
}

.group-link {
  text-align: left;
  border: none;
  background: none;
  padding: 0.35rem 0.6rem;
  flex: none;
}

.group-link:hover:not(:disabled) {
  background: var(--bg-input);
}

.group-link.active {
  background: var(--bg-input);
  color: var(--accent);
}

.options {
  border-top: 1px solid var(--border);
  margin-top: 0.75rem;
  padding: 0.75rem 0.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.85rem;
}

.option {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--fg-muted);
}

.main {
  min-width: 0;
  min-height: 0;
  display: flex;
}

.close {
  position: absolute;
  top: 0.6rem;
  right: 0.9rem;
  z-index: 2;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  background: none;
  font-size: 1.4rem;
  line-height: 1;
  color: var(--fg-muted);
}

.close:hover:not(:disabled) {
  color: var(--fg);
  background: var(--bg-elevated);
}

.pane {
  flex: 1;
  overflow-y: auto;
  padding: 0 2rem 2rem;
  position: relative;
}

.empty {
  padding-top: 1.5rem;
}

.group h3 {
  position: sticky;
  top: 0;
  margin: 0;
  padding: 1.1rem 0 0.6rem;
  font-size: 1.15rem;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  z-index: 1;
}

.group + .group {
  margin-top: 1.25rem;
}

.group {
  position: relative;
}

.group.flash::after {
  content: '';
  position: absolute;
  inset: 0 -0.75rem;
  border-radius: 8px;
  pointer-events: none;
  z-index: 2;
  animation: flash 1.1s ease-in-out;
}

@keyframes flash {
  0%,
  50%,
  100% {
    background: transparent;
    box-shadow: inset 0 0 0 1px transparent;
  }

  25%,
  75% {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent);
  }
}

h4 {
  margin: 1.25rem 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--fg-muted);
}

.setting {
  display: flex;
  gap: 1.5rem;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--border);
}

.section:last-child .setting:last-child {
  border-bottom: none;
}

.text {
  min-width: 0;
  flex: 1;
}

.label {
  font-weight: 600;
}

.description {
  margin-top: 0.2rem;
  color: var(--fg-muted);
  line-height: 1.4;
}

.name {
  margin-top: 0.3rem;
  font-size: 0.75rem;
  color: var(--fg-muted);
  opacity: 0.7;
  overflow-wrap: anywhere;
}

.failure {
  margin-top: 0.3rem;
  font-size: 0.85rem;
  white-space: pre-wrap;
}

.control {
  flex: none;
  padding-top: 0.1rem;
}

.value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
}

.value input {
  width: 15rem;
}

.buttons {
  gap: 0.4rem;
}

.switch {
  display: inline-flex;
  cursor: pointer;
}

.switch input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.track {
  width: 2.4rem;
  height: 1.35rem;
  border-radius: 999px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  position: relative;
  transition: background 0.15s, border-color 0.15s;
}

.thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(1.35rem - 6px);
  height: calc(1.35rem - 6px);
  border-radius: 50%;
  background: var(--fg-muted);
  transition: transform 0.15s, background 0.15s;
}

.switch input:checked + .track {
  background: var(--accent-strong);
  border-color: var(--accent-strong);
}

.switch input:checked + .track .thumb {
  transform: translateX(1.05rem);
  background: #fff;
}

.switch input:focus-visible + .track {
  outline: 1px solid var(--accent);
  outline-offset: 2px;
}

.switch input:disabled + .track {
  opacity: 0.5;
}

.error {
  color: var(--danger);
}

@media (max-width: 720px) {
  .overlay {
    padding: 0;
  }

  .settings {
    height: 100%;
    border-radius: 0;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .groups {
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.5rem;
  }

  .group-list {
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .group-link {
    white-space: nowrap;
  }

  .options {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
  }

  .pane {
    padding: 0 1rem 1.5rem;
  }

  .setting {
    flex-direction: column;
    gap: 0.6rem;
  }

  .value {
    align-items: stretch;
  }

  .value input {
    width: 100%;
  }
}
</style>
