import { describe, expect, it } from 'vitest'
import { groupSettings, humanize, isBoolean, settingPriority } from '../settings'

const property = (name: string, value: string | null = null) => ({ name, value, description: null })
const labels = (names: string[], sort?: 'priority' | 'alphabetical') =>
  groupSettings(names.map((name) => property(name)), sort).map((group) => ({
    title: group.title,
    sections: group.sections.map((section) => [section.title, ...section.settings.map((s) => s.label)]),
  }))

describe('humanize', () => {
  it('capitalizes and splits words', () => {
    expect(humanize('retry-max-interval-ms')).toBe('Retry max interval (ms)')
    expect(humanize('url')).toBe('URL')
    expect(humanize('game-for-each-version')).toBe('Game for each version')
  })
})

describe('groupSettings', () => {
  it('groups by the segment after hmc and sections by the next one', () => {
    expect(
      labels(['hmc.assets.url', 'hmc.assets.parallel.parallelism', 'hmc.assets.parallel.retry-jitter', 'hmc.i18n.locale']),
    ).toEqual([
      { title: 'Language', sections: [['', 'Locale']] },
      { title: 'Assets', sections: [['', 'URL'], ['Parallel', 'Parallelism', 'Retry jitter']] },
    ])
  })

  it('unifies the logging properties', () => {
    expect(labels(['hmc.log.file', 'hmc.log4jappender.ansi', 'hmc.logging.patch', 'hmc.log.console-level'])).toEqual([
      { title: 'Logging', sections: [['', 'Console level', 'File', 'Log4j appender ANSI', 'Logging patch']] },
    ])
  })

  it('puts hmc-specifics properties into Runtime, sectioned by their prefix', () => {
    expect(
      labels([
        'hmc.adventure.enabled',
        'hmc.adventure.color.none',
        'hmc.account.refresh.enabled',
        'hmc.account.refresh.interval',
        'hmc.resourcepacks.autoaccept',
      ]),
    ).toEqual([
      {
        title: 'Runtime',
        sections: [
          ['', 'Resource packs auto-accept'],
          ['Account', 'Refresh enabled', 'Refresh interval'],
          ['Adventure', 'Enabled', 'Color none'],
        ],
      },
    ])
  })

  it('puts properties of other namespaces into Other, last', () => {
    expect(labels(['quarkus.http.port', 'quarkus.http.host', 'HOME', 'hmc.java.download'])).toEqual([
      { title: 'Java', sections: [['', 'Download']] },
      { title: 'Other', sections: [['', 'HOME'], ['quarkus', 'http.host', 'http.port']] },
    ])
  })

  it('sorts by priority or alphabetically', () => {
    const names = ['hmc.net.user-agent', 'hmc.net.retries', 'hmc.java.download', 'hmc.files.location']
    expect(labels(names).map((g) => [g.title, ...g.sections[0].slice(1)])).toEqual([
      ['Java', 'Download'],
      ['Files', 'Location'],
      ['Network', 'Retries', 'User agent'],
    ])
    expect(labels(names, 'alphabetical').map((g) => [g.title, ...g.sections[0].slice(1)])).toEqual([
      ['Files', 'Location'],
      ['Java', 'Download'],
      ['Network', 'Retries', 'User agent'],
    ])
  })

  it('puts top level properties into a general group', () => {
    expect(groupSettings([property('hmc.cpu')])[0]).toMatchObject({ id: 'general', title: 'General' })
  })
})

describe('settingPriority', () => {
  it('ranks rarely touched settings low', () => {
    expect(settingPriority('hmc.parallel.parallelism')).toBeLessThan(settingPriority('hmc.assets.parallel.breaker-minimum-calls'))
    expect(settingPriority('hmc.unknown')).toBe(50)
  })
})

describe('isBoolean', () => {
  it('detects boolean values', () => {
    expect(isBoolean(property('a', 'true'))).toBe(true)
    expect(isBoolean(property('a', 'yes'))).toBe(false)
  })
})
