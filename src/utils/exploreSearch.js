import { CATALOG_INDEX } from './catalog.js'
import { formatDesignation, generateArticleUrl, generateJpUrl } from './urlGenerator.js'

const normalizedFields = new WeakMap()
const titleCollator = new Intl.Collator('ja', { numeric: true, sensitivity: 'base' })
const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase().trim()
const designationPattern = /^scp-(?:[a-z]+-)?\d+(?:-[a-z]+)*$/

function designationKey(value) {
  return value.replace(/\d+/, digits => String(Number(digits)))
}

function fieldsFor(record) {
  let fields = normalizedFields.get(record)
  if (!fields) {
    const designation = normalize(record.article.designation)
    fields = {
      designation,
      designationKey: designationKey(designation),
      title: normalize(record.title),
      number: record.article.number == null ? '' : String(record.article.number),
    }
    normalizedFields.set(record, fields)
  }
  return fields
}

function jpSlug(url) {
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'scp-jp.wikidot.com' ? parsed.pathname.slice(1) : null
  } catch {
    return null
  }
}

function finiteMetric(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** One published record per canonical article, including rows without metadata. */
export function buildExploreIndex({ titles = {}, charCounts = {}, ratings = {} } = {}) {
  const records = []
  for (const entry of CATALOG_INDEX.values()) {
    const { id, branchCode, branch, series, number } = entry
    const source = entry.article
    const title = source?.title ?? titles[branchCode]?.[String(number)] ?? ''
    const article = {
      ...(source ?? {
        designation: formatDesignation(branchCode, number),
        url: generateJpUrl(branchCode, number),
        originalUrl: generateArticleUrl(branchCode, number),
      }),
      id,
      branchCode,
      branch,
      seriesId: series.id,
      number,
      title,
      predicted: false,
    }
    const slug = jpSlug(article.url)
    const record = {
      id,
      article,
      branch,
      series,
      title,
      charCount: slug == null ? null : finiteMetric(charCounts[slug]),
      rating: slug == null ? null : finiteMetric(ratings[slug]),
    }
    fieldsFor(record)
    records.push(record)
  }
  return records
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

function compareNumbers(a, b, direction = 1) {
  const left = a.article.number
  const right = b.article.number
  if (left == null) return right == null ? 0 : 1
  if (right == null) return -1
  return (left - right) * direction
}

function compareTitle(a, b) {
  const left = fieldsFor(a)
  const right = fieldsFor(b)
  return titleCollator.compare(left.title || left.designation, right.title || right.designation)
}

// Ties do not depend on insertion order or on a preceding sort selection.
function compareTie(a, b) {
  return compareText(a.branch.code, b.branch.code)
    || compareNumbers(a, b)
    || compareText(a.id, b.id)
}

function compareNumberOrder(a, b, direction) {
  return compareNumbers(a, b, direction)
    || (a.article.number == null && b.article.number == null ? compareTitle(a, b) : 0)
    || compareTie(a, b)
}

function compareMetric(a, b, key, direction) {
  const left = a[key]
  const right = b[key]
  if (left == null) return right == null ? compareTie(a, b) : 1
  if (right == null) return -1
  return (left - right) * direction || compareTie(a, b)
}

const sorters = {
  'number-asc': (a, b) => compareNumberOrder(a, b, 1),
  'number-desc': (a, b) => compareNumberOrder(a, b, -1),
  'title-asc': (a, b) => compareTitle(a, b) || compareTie(a, b),
  'rating-asc': (a, b) => compareMetric(a, b, 'rating', 1),
  'rating-desc': (a, b) => compareMetric(a, b, 'rating', -1),
  'chars-asc': (a, b) => compareMetric(a, b, 'charCount', 1),
  'chars-desc': (a, b) => compareMetric(a, b, 'charCount', -1),
}

/** Filter and sort the complete result set; callers paginate only afterward. */
export function queryExploreIndex(index, {
  query = '', branchCode = '', seriesId = '', readFilter = 'all',
  favoritesOnly = false, sortBy = 'number-asc',
  isChecked = () => false, isFavorite = () => false,
} = {}) {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  const scopedBranch = normalize(branchCode).toUpperCase()
  const hasSeriesScope = seriesId !== '' && seriesId != null

  const results = index.filter(record => {
    if (scopedBranch && record.branch.code !== scopedBranch) return false
    if (hasSeriesScope && String(record.series.id) !== String(seriesId)) return false
    if (readFilter === 'read' && !isChecked(record.id)) return false
    if (readFilter === 'unread' && isChecked(record.id)) return false
    if (favoritesOnly && !isFavorite(record.id)) return false
    if (!terms.length) return true

    const fields = fieldsFor(record)
    return terms.every(term => {
      // A complete designation is a designation lookup. Never extract its
      // digits and accidentally match the same number in other branches.
      if (designationPattern.test(term)) return fields.designationKey === designationKey(term)
      return fields.designation.includes(term) || fields.title.includes(term) || fields.number.includes(term)
    })
  })
  return results.sort(sorters[sortBy] ?? sorters['number-asc'])
}
