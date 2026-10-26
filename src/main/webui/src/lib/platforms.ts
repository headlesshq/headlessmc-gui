// Logos of the platforms HeadlessMc can install, keyed by platform name.
import fabric from '../assets/platforms/fabric.png'
import forge from '../assets/platforms/forge.svg'
import neoforge from '../assets/platforms/neoforge.png'
import paper from '../assets/platforms/paper.svg'
import purpur from '../assets/platforms/purpur.svg'
import vanilla from '../assets/platforms/vanilla.svg'

const LOGOS: Record<string, string> = { fabric, forge, neoforge, paper, purpur, vanilla }

const NAMES: Record<string, string> = {
  fabric: 'Fabric',
  forge: 'Forge',
  neoforge: 'NeoForge',
  paper: 'Paper',
  purpur: 'Purpur',
  vanilla: 'Vanilla',
}

/** The logo of a platform, or null for platforms without one. */
export function platformLogo(platform: string | null | undefined): string | null {
  return platform ? (LOGOS[platform.toLowerCase()] ?? null) : null
}

/** "neoforge" -> "NeoForge", unknown platforms are capitalized. */
export function platformName(platform: string): string {
  return NAMES[platform.toLowerCase()] ?? platform.charAt(0).toUpperCase() + platform.slice(1)
}
