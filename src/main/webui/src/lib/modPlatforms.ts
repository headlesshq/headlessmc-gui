// Logos and names of the mod distribution platforms mods can be downloaded from.
import curseforge from '../assets/mod-platforms/curseforge.svg'
import github from '../assets/mod-platforms/github.svg'
import modrinth from '../assets/mod-platforms/modrinth.svg'
import hmcMcp from '../assets/github-mods/hmc-mcp.png'
import hmcOptimizations from '../assets/github-mods/hmc-optimizations.png'
import hmcPrometheus from '../assets/github-mods/hmc-prometheus.png'
import hmcSpecifics from '../assets/github-mods/hmc-specifics.png'
import mcRuntimeTest from '../assets/github-mods/mc-runtime-test.png'

const LOGOS: Record<string, string> = { curseforge, github, modrinth }

const NAMES: Record<string, string> = {
  curseforge: 'CurseForge',
  github: 'GitHub',
  modrinth: 'Modrinth',
}

/** Logos of the mods distributed on GitHub, from their READMEs (made with headlessmc-svg-mapping), by mod id. */
const GITHUB_MOD_ICONS: Record<string, string> = {
  'hmc-mcp': hmcMcp,
  'hmc-optimizations': hmcOptimizations,
  'hmc-prometheus': hmcPrometheus,
  'hmc-specifics': hmcSpecifics,
  'mc-runtime-test': mcRuntimeTest,
}

/** The config property holding the CurseForge API key. */
export const CURSEFORGE_API_KEY = 'hmc.mods.curseforge.api-key'

/** Where CurseForge API keys can be generated. */
export const CURSEFORGE_TOKEN_URL = 'https://legacy.curseforge.com/account/api-tokens'

/** The logo of a mod distribution platform, or null for platforms without one. */
export function modPlatformLogo(platform: string): string | null {
  return LOGOS[platform.toLowerCase()] ?? null
}

/** "curseforge" -> "CurseForge", unknown platforms are capitalized. */
export function modPlatformName(platform: string): string {
  return NAMES[platform.toLowerCase()] ?? platform.charAt(0).toUpperCase() + platform.slice(1)
}

/** The bundled icon of a mod found on a platform, or the icon the platform returned. */
export function remoteModIcon(platform: string, mod: { id: string; iconUrl: string | null }): string | null {
  return (platform === 'github' ? GITHUB_MOD_ICONS[mod.id] : undefined) ?? mod.iconUrl
}
