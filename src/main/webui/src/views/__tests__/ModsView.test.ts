import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { flush, mockFetch } from '../../components/__tests__/mockFetch'
import ModsView from '../ModsView.vue'

const profile = {
  name: 'neoforge-26.3',
  side: 'client',
  version: 'neoforge 26.3',
  currentVersion: 'neoforge 26.3',
  platform: 'neoforge',
  path: '/mc',
  javaVersion: null,
  patchers: [],
  vmArgs: [],
  gameArgs: [],
  systemProperties: {},
  eulaStatus: 'UNKNOWN',
}

const mod = {
  path: 'mods/sodium.jar',
  fileName: 'sodium.jar',
  type: 'mod',
  world: null,
  directory: false,
  size: 2_000_000,
  modified: 1,
  enabled: true,
  displayName: 'Sodium',
  version: '0.9.2',
  description: 'Fast rendering',
  authors: ['jellysquid3'],
  mods: [{ id: 'sodium', name: 'Sodium' }],
  hasLogo: true,
}

function listing(files: unknown[], curseforge = false) {
  return {
    profile: profile.name,
    side: 'client',
    platform: 'neoforge',
    type: 'mod',
    types: ['mod', 'resourcepack'],
    worlds: [],
    files,
    platforms: [
      { name: 'modrinth', enabled: true, mods: null },
      { name: 'curseforge', enabled: curseforge, mods: null },
      {
        name: 'github',
        enabled: true,
        mods: [
          { id: 'hmc-specifics', name: 'hmc-specifics', description: 'Specifics', iconUrl: null },
          { id: 'hmc-prometheus', name: 'hmc-prometheus', description: 'Prometheus exporter', iconUrl: null },
        ],
      },
    ],
  }
}

function platformButton(wrapper: Awaited<ReturnType<typeof mountMods>>['wrapper'], name: string) {
  return wrapper.findAll('.platforms button').find((button) => button.text() === name)!
}

async function mountMods() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/mods', component: ModsView }] })
  await router.push('/mods')
  const wrapper = mount(ModsView, { global: { plugins: [router] } })
  await flush(10)
  return { wrapper, router }
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('ModsView', () => {
  it('selects a profile and shows its mods with logos', async () => {
    mockFetch({
      'GET /api/profiles': () => [profile],
      'GET /api/servers': () => [],
      'GET /api/mods/neoforge-26.3': () => listing([mod]),
    })
    const { wrapper, router } = await mountMods()
    expect(router.currentRoute.value.query.profile).toBe('neoforge-26.3')
    expect(wrapper.text()).toContain('Sodium')
    expect(wrapper.text()).toContain('0.9.2')
    expect(wrapper.text()).toContain('Resource packs')
    expect(wrapper.find('img.logo').attributes('src')).toBe('/api/mods/neoforge-26.3/logo?path=mods%2Fsodium.jar&v=1')
  })

  it('uploads dropped jar files', async () => {
    let uploaded = false
    const calls = mockFetch({
      'GET /api/profiles': () => [profile],
      'GET /api/servers': () => [],
      'GET /api/mods/neoforge-26.3': () => listing(uploaded ? [mod] : []),
      'POST /api/mods/neoforge-26.3/files': () => {
        uploaded = true
        return [mod]
      },
    })
    const { wrapper } = await mountMods()
    expect(wrapper.text()).toContain('Drag .jar or .zip files here')

    const jar = new File(['jar'], 'sodium.jar')
    const text = new File(['txt'], 'notes.txt')
    await wrapper.find('section.installed').trigger('drop', { dataTransfer: { files: [jar, text], types: ['Files'] } })
    await flush(10)

    const upload = calls.find((call) => call.method === 'POST')
    expect(upload?.url).toBe('/api/mods/neoforge-26.3/files?type=mod&overwrite=false')
    expect(wrapper.text()).toContain('Only .jar and .zip files can be added: notes.txt')
    expect(wrapper.text()).toContain('Sodium')
  })

  it('searches the selected platform', async () => {
    const calls = mockFetch({
      'GET /api/profiles': () => [profile],
      'GET /api/servers': () => [],
      'GET /api/mods/neoforge-26.3': () => listing([]),
      'GET /api/mods/neoforge-26.3/search': () => [{ id: 'sodium', name: 'Sodium', description: 'Fast rendering', iconUrl: null }],
    })
    const { wrapper } = await mountMods()
    expect(wrapper.find('.search h3').text()).toBe('Download from Modrinth')

    await wrapper.find('.search input').setValue('sodium')
    await wrapper.find('.search form').trigger('submit')
    await flush(10)

    const search = calls.find((call) => call.url.includes('/search'))
    expect(search?.url).toBe('/api/mods/neoforge-26.3/search?type=mod&query=sodium&platform=modrinth')
    expect(wrapper.text()).toContain('Fast rendering')
  })

  it('shows the GitHub mods without searching', async () => {
    const calls = mockFetch({
      'GET /api/profiles': () => [profile],
      'GET /api/servers': () => [],
      'GET /api/mods/neoforge-26.3': () => listing([]),
    })
    const { wrapper } = await mountMods()
    await platformButton(wrapper, 'GitHub').trigger('click')
    await flush()

    expect(wrapper.find('.search h3').text()).toBe('Download from GitHub')
    expect(wrapper.findAll('.result')).toHaveLength(2)
    expect(wrapper.find('.result img').attributes('src')).toContain('hmc-specifics')
    expect(localStorage.getItem('hmc-mods-platform')).toBe('github')

    await wrapper.find('.search input').setValue('prometheus')
    expect(wrapper.findAll('.result')).toHaveLength(1)
    expect(wrapper.text()).toContain('hmc-prometheus')
    expect(calls.some((call) => call.url.includes('/search'))).toBe(false)
  })

  it('asks for a CurseForge API token before searching CurseForge', async () => {
    let configured = false
    const calls = mockFetch({
      'GET /api/profiles': () => [profile],
      'GET /api/servers': () => [],
      'GET /api/mods/neoforge-26.3': () => listing([], configured),
      'POST /api/jobs': () => {
        configured = true
        return { id: 'job-1', line: 'config set', status: 'SUCCEEDED', output: '' }
      },
      'GET /api/jobs/job-1': () => ({ id: 'job-1', line: 'config set', status: 'SUCCEEDED', output: '' }),
    })
    const { wrapper } = await mountMods()
    await platformButton(wrapper, 'CurseForge').trigger('click')

    const link = wrapper.find('.api-key a')
    expect(link.attributes('href')).toBe('https://legacy.curseforge.com/account/api-tokens')
    expect(wrapper.find('.search input[placeholder^="Search"]').exists()).toBe(false)

    await wrapper.find('.api-key input').setValue('secret-token')
    await wrapper.find('.api-key').trigger('submit')
    await flush(20)

    const job = calls.find((call) => call.method === 'POST' && call.url === '/api/jobs')
    expect((job?.body as { line: string }).line).toBe('config set hmc.mods.curseforge.api-key secret-token')
    expect(wrapper.find('.api-key').exists()).toBe(false)
    expect(wrapper.find('.search input[placeholder^="Search"]').exists()).toBe(true)
  })
})
