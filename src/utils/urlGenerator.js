import { getBranch } from '../data/branches.js'

const JP_DOMAIN = 'http://scp-jp.wikidot.com'

/**
 * Zero-pad a number to at least 3 digits (e.g. 1 → "001", 18 → "018", 1000 → "1000").
 */
function padNum(number) {
  return String(number).padStart(3, '0')
}

/**
 * Generate the slug for an article (shared between original and JP-translated URLs).
 */
function getSlug(branchCode, number) {
  const lc = branchCode.toLowerCase()
  const branch = getBranch(branchCode)
  const n = padNum(number)
  if (!branch) return `scp-${n}`

  switch (branch.urlPattern) {
    case 'en':        return `scp-${n}`
    case 'prefix-cn': return `scp-cn-${n}`
    case 'prefix-pl': return `scp-pl-${n}`
    case 'prefix-zh': return `scp-zh-${n}`
    case 'suffix':
    default:          return `scp-${n}-${lc}`
  }
}

/**
 * Original wiki URL for an article.
 */
export function generateArticleUrl(branchCode, number) {
  const branch = getBranch(branchCode)
  if (!branch) return null
  return `${branch.domain}/${getSlug(branchCode, number)}`
}

/**
 * JP wiki URL for an article.
 * JP original articles → same domain, same slug.
 * All other branches → scp-jp.wikidot.com/{original-slug}
 * (JP wiki hosts translations under the same slug as the source article.)
 */
export function generateJpUrl(branchCode, number) {
  return `${JP_DOMAIN}/${getSlug(branchCode, number)}`
}

/**
 * Return true if the article is beyond the confirmed active range
 * (predicted URL, may not exist yet).
 */
export function isPredicted(branchCode, number) {
  const branch = getBranch(branchCode)
  if (!branch) return true
  return number > branch.activeMax
}

/**
 * Human-readable SCP designation.
 * EN:  SCP-173
 * JP:  SCP-173-JP
 * CN:  SCP-CN-173
 * PL:  SCP-PL-173
 * ZH:  SCP-ZH-173
 */
export function formatDesignation(branchCode, number) {
  const padded = String(number).padStart(3, '0')
  switch (branchCode) {
    case 'EN': return `SCP-${padded}`
    case 'CN': return `SCP-CN-${padded}`
    case 'PL': return `SCP-PL-${padded}`
    case 'ZH': return `SCP-ZH-${padded}`
    default:   return `SCP-${padded}-${branchCode}`
  }
}

/**
 * Generate all article entries for a branch + series range.
 */
export function generateSeriesArticles(branchCode, seriesMin, seriesMax) {
  const branch = getBranch(branchCode)
  const min = branch?.minNumber
    ? Math.max(seriesMin, branch.minNumber)
    : seriesMin

  const articles = []
  for (let n = min; n <= seriesMax; n++) {
    articles.push({
      id: `${branchCode}-${n}`,
      branchCode,
      number: n,
      url: generateJpUrl(branchCode, n),
      originalUrl: generateArticleUrl(branchCode, n),
      predicted: isPredicted(branchCode, n),
      designation: formatDesignation(branchCode, n),
    })
  }
  return articles
}
