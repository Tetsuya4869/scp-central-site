import { getBranch } from '../data/branches.js'

/**
 * Generate the canonical article URL for a given branch + number.
 */
export function generateArticleUrl(branchCode, number) {
  const branch = getBranch(branchCode)
  if (!branch) return null
  const { domain, urlPattern } = branch
  const lc = branchCode.toLowerCase()

  let slug
  switch (urlPattern) {
    case 'en':
      slug = `scp-${number}`
      break
    case 'prefix-cn':
      slug = `scp-cn-${number}`
      break
    case 'prefix-pl':
      slug = `scp-pl-${number}`
      break
    case 'prefix-zh':
      slug = `scp-zh-${number}`
      break
    case 'suffix':
    default:
      slug = `scp-${number}-${lc}`
      break
  }

  return `${domain}/${slug}`
}

/**
 * Return true if the article at `number` is beyond the confirmed active range
 * (i.e. the URL is predicted, not guaranteed to exist).
 */
export function isPredicted(branchCode, number) {
  const branch = getBranch(branchCode)
  if (!branch) return true
  return number > branch.activeMax
}

/**
 * Human-readable SCP designation for display.
 * EN:  SCP-173
 * JP:  SCP-173-JP
 * CN:  SCP-CN-173
 * PL:  SCP-PL-173
 * ZH:  SCP-ZH-173
 */
export function formatDesignation(branchCode, number) {
  const padded = String(number).padStart(3, '0')
  switch (branchCode) {
    case 'EN':
      return `SCP-${padded}`
    case 'CN':
      return `SCP-CN-${padded}`
    case 'PL':
      return `SCP-PL-${padded}`
    case 'ZH':
      return `SCP-ZH-${padded}`
    default:
      return `SCP-${padded}-${branchCode}`
  }
}

/**
 * Generate all article entries for a given branch + series range.
 * Returns array of { id, branchCode, number, url, predicted, designation }
 */
export function generateSeriesArticles(branchCode, seriesMin, seriesMax) {
  const articles = []
  const branch = getBranch(branchCode)
  const min = branch?.minNumber
    ? Math.max(seriesMin, branch.minNumber)
    : seriesMin

  for (let n = min; n <= seriesMax; n++) {
    articles.push({
      id: `${branchCode}-${n}`,
      branchCode,
      number: n,
      url: generateArticleUrl(branchCode, n),
      predicted: isPredicted(branchCode, n),
      designation: formatDesignation(branchCode, n),
    })
  }
  return articles
}
