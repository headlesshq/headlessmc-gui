import type { ConfigProperty } from './types'

export interface Setting {
  property: ConfigProperty
  label: string
  /** lower is more important */
  priority: number
}

export interface SettingSection {
  /** empty for the settings directly below the group */
  title: string
  settings: Setting[]
}

export interface SettingGroup {
  id: string
  title: string
  /** lower is more important */
  priority: number
  sections: SettingSection[]
}

export type SettingSort = 'priority' | 'alphabetical'

export const OTHER_GROUP = 'other'

const DEFAULT_PRIORITY = 50

const groups: Record<string, { title: string; priority: number }> = {
  general: { title: 'General', priority: 0 },
  launcher: { title: 'Launcher', priority: 1 },
  java: { title: 'Java', priority: 2 },
  files: { title: 'Files', priority: 3 },
  language: { title: 'Language', priority: 4 },
  auth: { title: 'Authentication', priority: 5 },
  server: { title: 'Server', priority: 6 },
  runtime: { title: 'Runtime', priority: 7 },
  logging: { title: 'Logging', priority: 8 },
  terminal: { title: 'Terminal', priority: 9 },
  net: { title: 'Network', priority: 10 },
  parallel: { title: 'Parallelism', priority: 11 },
  assets: { title: 'Assets', priority: 12 },
  libraries: { title: 'Libraries', priority: 13 },
  testing: { title: 'Testing', priority: 14 },
  [OTHER_GROUP]: { title: 'Other', priority: 1000 },
}

/**
 * Moves the first segment of a property name (after `hmc.`) into another group.
 * With `keep` the segment stays part of the setting's name, e.g. `adventure.enabled` in Runtime becomes `Adventure › Enabled`.
 */
const moved: Record<string, { group: string; keep: boolean }> = {
  i18n: { group: 'language', keep: false },
  jline: { group: 'terminal', keep: false },
  log: { group: 'logging', keep: false },
  log4jappender: { group: 'logging', keep: true },
  logging: { group: 'logging', keep: true },
  web: { group: 'logging', keep: true },
  account: { group: 'runtime', keep: true },
  adventure: { group: 'runtime', keep: true },
  debug: { group: 'runtime', keep: true },
  lwjgl: { group: 'runtime', keep: true },
  resourcepacks: { group: 'runtime', keep: true },
  test: { group: 'testing', keep: true },
  xvfb: { group: 'testing', keep: true },
}

/** Priorities of settings by their name without `hmc.`, the first match wins. */
const priorities: [RegExp, number][] = [
  [/^launcher\.auto-install$/, 10],
  [/^launcher\.free$/, 20],
  [/^java\.download$/, 10],
  [/^java\.max-scan-depth$/, 60],
  [/^java\.fail-on-parsing-failure$/, 70],
  [/^files\.location$/, 10],
  [/^files\.game-for-each-version$/, 20],
  [/^i18n\.locale$/, 10],
  [/^server\.script\.mock-java$/, 10],
  [/^server\.script\.timeout$/, 20],
  [/^account\.refresh\.enabled$/, 10],
  [/^resourcepacks\.autoaccept$/, 15],
  [/^account\.refresh\.interval$/, 20],
  [/^adventure\.enabled$/, 30],
  [/^adventure\.color\.none$/, 40],
  [/^adventure\.output\.throwables$/, 70],
  [/^debug\./, 80],
  [/^log\.console-level$/, 10],
  [/^log\.file$/, 20],
  [/^log\.file-level$/, 25],
  [/^log\.stacktraces$/, 30],
  [/^web\.log-level$/, 40],
  [/^log\./, 60],
  [/^log4jappender\./, 70],
  [/^logging\./, 80],
  [/^jline\.enabled$/, 10],
  [/^jline\.ansi-colors$/, 20],
  [/^jline\.persistent-completions$/, 30],
  [/^jline\.dumb$/, 60],
  [/^net\.retries$/, 10],
  [/^net\.(cookies|delete-failed-files)$/, 60],
  [/^net\.user-agent$/, 70],
  [/^(\w+\.)?parallel\.parallelism$/, 10],
  [/^(\w+\.)?parallel\.retry-max-attempts$/, 20],
  [/^(\w+\.)?parallel\.retry-/, 60],
  [/^(\w+\.)?parallel\.rate-limit-/, 70],
  [/^(\w+\.)?parallel\.breaker-/, 80],
  [/^assets\.dummy$/, 30],
  [/^assets\.url$/, 60],
  [/^xvfb\.check$/, 10],
]

const words: Record<string, string> = {
  api: 'API',
  ansi: 'ANSI',
  autoaccept: 'auto-accept',
  cpu: 'CPU',
  gl: 'GL',
  http: 'HTTP',
  java: 'Java',
  jline: 'JLine',
  jvm: 'JVM',
  log4jappender: 'Log4j appender',
  lwjgl: 'LWJGL',
  ms: '(ms)',
  os: 'OS',
  resourcepacks: 'resource packs',
  seconds: '(seconds)',
  url: 'URL',
  xvfb: 'Xvfb',
  yggdrasil: 'Yggdrasil',
}

/** Turns a segment of a property name like `retry-max-interval-ms` into `Retry max interval (ms)`. */
export function humanize(segment: string): string {
  const text = segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => words[word.toLowerCase()] ?? word)
    .join(' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function settingPriority(name: string): number {
  const key = name.replace(/^hmc\./, '')
  return priorities.find(([pattern]) => pattern.test(key))?.[1] ?? DEFAULT_PRIORITY
}

interface Placement {
  group: string
  /** the segments of the name that make up section and label */
  path: string[]
  raw: boolean
}

function place(name: string): Placement {
  if (!name.startsWith('hmc.')) return { group: OTHER_GROUP, path: name.split('.'), raw: true }
  const segments = name.slice(4).split('.')
  if (segments.length === 1) return { group: 'general', path: segments, raw: false }
  const move = moved[segments[0]]
  if (move) return { group: move.group, path: move.keep ? segments : segments.slice(1), raw: false }
  return { group: segments[0], path: segments.slice(1), raw: false }
}

/**
 * Groups config properties by their name: `hmc.<group>.<section>.<setting>`.
 * The `hmc.` prefix is dropped, some related prefixes share a group and properties of other namespaces end up in {@link OTHER_GROUP}.
 */
export function groupSettings(properties: ConfigProperty[], sort: SettingSort = 'priority'): SettingGroup[] {
  const result = new Map<string, SettingGroup>()
  const placements = new Map<SettingSection, Placement>()
  for (const property of properties) {
    const placement = place(property.name)
    const { path, raw } = placement
    let group = result.get(placement.group)
    if (!group) {
      const known = groups[placement.group]
      group = {
        id: placement.group,
        title: known?.title ?? humanize(placement.group),
        priority: known?.priority ?? DEFAULT_PRIORITY,
        sections: [],
      }
      result.set(placement.group, group)
    }
    const sectionTitle = path.length > 1 ? (raw ? path[0] : humanize(path[0])) : ''
    let section = group.sections.find((s) => s.title === sectionTitle)
    if (!section) {
      section = { title: sectionTitle, settings: [] }
      group.sections.push(section)
    }
    const rest = path.length > 1 ? path.slice(1) : path
    section.settings.push({
      property,
      label: (raw ? rest.join('.') : humanize(rest.join('-'))) || property.name,
      priority: settingPriority(property.name),
    })
    placements.set(section, placement)
  }
  for (const group of result.values()) {
    group.sections = mergeSingleSettingSections(group.sections, placements)
    sortSections(group.sections, sort)
  }
  return [...result.values()].sort((a, b) => {
    if ((a.id === OTHER_GROUP) !== (b.id === OTHER_GROUP)) return a.id === OTHER_GROUP ? 1 : -1
    return sort === 'priority' ? a.priority - b.priority || a.title.localeCompare(b.title) : a.title.localeCompare(b.title)
  })
}

/** A section with just one setting is not worth a heading, e.g. `xvfb.check` in Testing becomes `Xvfb check`. */
function mergeSingleSettingSections(sections: SettingSection[], placements: Map<SettingSection, Placement>): SettingSection[] {
  const general: SettingSection = { title: '', settings: [] }
  const rest: SettingSection[] = []
  for (const section of sections) {
    if (!section.title) {
      general.settings.push(...section.settings)
    } else if (section.settings.length === 1) {
      const { path, raw } = placements.get(section)!
      general.settings.push({ ...section.settings[0], label: raw ? path.join('.') : humanize(path.join('-')) })
    } else {
      rest.push(section)
    }
  }
  return general.settings.length ? [general, ...rest] : rest
}

function sortSections(sections: SettingSection[], sort: SettingSort) {
  const bySetting = (a: Setting, b: Setting) =>
    sort === 'priority' ? a.priority - b.priority || a.label.localeCompare(b.label) : a.label.localeCompare(b.label)
  for (const section of sections) section.settings.sort(bySetting)
  const top = (section: SettingSection) => Math.min(...section.settings.map((s) => s.priority))
  sections.sort((a, b) => {
    if (!a.title || !b.title) return (a.title ? 1 : 0) - (b.title ? 1 : 0)
    return sort === 'priority' ? top(a) - top(b) || a.title.localeCompare(b.title) : a.title.localeCompare(b.title)
  })
}

/** Whether a property holds a boolean and can be shown as a switch. */
export function isBoolean(property: ConfigProperty): boolean {
  return property.value === 'true' || property.value === 'false'
}
