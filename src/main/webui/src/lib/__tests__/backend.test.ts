import { describe, expect, it } from 'vitest'
import { backendUrl } from '../backend'
import { eventsUrl } from '../events'

const served = { protocol: 'http:', host: 'localhost:8080' } as Location
const tauri = { protocol: 'tauri:', host: 'localhost' } as Location

describe('backendUrl', () => {
  it('stays relative when the ui is served by the backend', () => {
    expect(backendUrl('/api/info', undefined)).toBe('/api/info')
  })

  it('resolves against the injected backend origin', () => {
    expect(backendUrl('/api/info', 'http://127.0.0.1:41234')).toBe('http://127.0.0.1:41234/api/info')
    expect(backendUrl('/api/info', 'http://127.0.0.1:41234/')).toBe('http://127.0.0.1:41234/api/info')
  })
})

describe('eventsUrl', () => {
  it('uses the page origin when the ui is served by the backend', () => {
    expect(eventsUrl(served, undefined)).toBe('ws://localhost:8080/ws/events')
  })

  it('uses the injected backend origin in the desktop app', () => {
    expect(eventsUrl(tauri, 'http://127.0.0.1:41234')).toBe('ws://127.0.0.1:41234/ws/events')
  })
})
