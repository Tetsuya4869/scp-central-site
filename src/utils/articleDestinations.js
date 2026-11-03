import { getCatalogEntry } from './catalog.js'
import { generateArticleUrl } from './urlGenerator.js'

const JP_HOST = 'scp-jp.wikidot.com'

function parseHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const literal = value.trim()
  // URL() also accepts strings such as "https:example.com". Only deliberate,
  // absolute web links are usable article destinations.
  if (!/^https?:\/\//i.test(literal)) return null
  try {
    const parsed = new URL(literal)
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) return null
    return { literal, parsed }
  } catch {
    return null
  }
}

function hostname(url) {
  return url.hostname.toLowerCase().replace(/\.$/, '')
}

function sameResource(left, right) {
  // A transport upgrade or a different fragment does not create another
  // language version. URL() has already normalized default ports and casing.
  return hostname(left) === hostname(right)
    && left.port === right.port
    && left.pathname === right.pathname
    && left.search === right.search
}

/** Resolve only known destinations; this never fetches or checks a wiki page. */
export function resolveArticleDestinations(article) {
  const primary = parseHttpUrl(article?.url)
  const canonical = getCatalogEntry(article?.id)
  const branchCode = canonical?.branchCode ?? article?.branchCode ?? article?.branch?.code
  const explicitOriginal = parseHttpUrl(article?.originalUrl)
  // Canonical numbered entries have a reliable branch URL pattern. Custom
  // collection IDs often differ from their slugs and must never be guessed.
  const generatedOriginal = canonical && canonical.article == null && canonical.number != null
    ? parseHttpUrl(generateArticleUrl(canonical.branchCode, canonical.number))
    : null
  const original = explicitOriginal ?? generatedOriginal
  const offersChoice = Boolean(
    primary && original
    && String(branchCode ?? '').toUpperCase() !== 'JP'
    && hostname(primary.parsed) === JP_HOST
    && hostname(original.parsed) !== JP_HOST
    && !sameResource(primary.parsed, original.parsed),
  )

  return {
    primaryUrl: primary?.literal ?? null,
    originalUrl: original?.literal ?? null,
    offersChoice,
  }
}
