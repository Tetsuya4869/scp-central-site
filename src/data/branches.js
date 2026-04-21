/**
 * SCP Foundation branch definitions.
 * URL patterns:
 *   'en'        -> /scp-{n}
 *   'suffix'    -> /scp-{n}-{code.toLowerCase()}
 *   'prefix-cn' -> /scp-cn-{n}
 *   'prefix-pl' -> /scp-pl-{n}
 *   'prefix-zh' -> /scp-zh-{n}
 *
 * hubs[].jpSlug: slug on scp-jp.wikidot.com
 *   null  = no JP translation exists; link goes to branch's own domain
 *   string = scp-jp.wikidot.com/{jpSlug}
 */

const JP = 'http://scp-jp.wikidot.com'

function jp(slug) { return `${JP}/${slug}` }

export const BRANCHES = [
  {
    code: 'EN',
    name: 'SCP Foundation',
    nativeName: 'SCP Foundation',
    language: 'English',
    domain: 'http://scp-wiki.wikidot.com',
    urlPattern: 'en',
    activeMax: 9999,
    color: '#1a3a5c',
    accent: '#4a90d9',
    series: [
      { id: 1,  label: 'Series I',    min: 1,    max: 999,  hub: '/scp-series' },
      { id: 2,  label: 'Series II',   min: 1000, max: 1999, hub: '/scp-series-2' },
      { id: 3,  label: 'Series III',  min: 2000, max: 2999, hub: '/scp-series-3' },
      { id: 4,  label: 'Series IV',   min: 3000, max: 3999, hub: '/scp-series-4' },
      { id: 5,  label: 'Series V',    min: 4000, max: 4999, hub: '/scp-series-5' },
      { id: 6,  label: 'Series VI',   min: 5000, max: 5999, hub: '/scp-series-6' },
      { id: 7,  label: 'Series VII',  min: 6000, max: 6999, hub: '/scp-series-7' },
      { id: 8,  label: 'Series VIII', min: 7000, max: 7999, hub: '/scp-series-8' },
      { id: 9,  label: 'Series IX',   min: 8000, max: 8999, hub: '/scp-series-9' },
      { id: 10, label: 'Series X',    min: 9000, max: 9999, hub: '/scp-series-10' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales',        label: '財団Tales（EN→JP翻訳）', url: jp('foundation-tales') },
          { id: 'series-arch',  label: 'シリーズアーカイブ',       url: jp('series-archive') },
        ]},
      { cat: '特殊SCP',
        items: [
          { id: '001',          label: '001 Proposals',           url: jp('scp-001') },
          { id: 'joke',         label: 'Joke SCPs',               url: jp('joke-scps') },
          { id: 'ex',           label: 'Explained SCPs',          url: jp('scp-ex') },
        ]},
      { cat: 'ログ・記録',
        items: [
          { id: 'anomalous',    label: '異常物品記録',              url: jp('log-of-anomalous-items') },
          { id: 'locations',    label: '未解明領域記録',             url: jp('log-of-unexplained-locations') },
          { id: 'events',       label: '超常現象記録',              url: jp('log-of-extranormal-events') },
        ]},
      { cat: 'GoI・カノン',
        items: [
          { id: 'canon',        label: 'カノンハブ',                url: jp('canon-hub') },
          { id: 'goi-formats',  label: 'GoIフォーマット',           url: jp('goi-formats') },
          { id: 'goi',          label: '要注意団体',                url: jp('groups-of-interest') },
          { id: 'mtf',          label: 'モバイル・タスクフォース',    url: jp('task-forces') },
          { id: 'sites',        label: '収容施設一覧',              url: jp('secure-facilities-locations') },
        ]},
    ],
  },

  {
    code: 'JP',
    name: 'SCP財団',
    nativeName: 'SCP財団',
    language: '日本語',
    domain: 'http://scp-jp.wikidot.com',
    urlPattern: 'suffix',
    activeMax: 4000,
    color: '#3a1a1a',
    accent: '#d94a4a',
    series: [
      { id: 1, label: 'JP Series I',   min: 1,    max: 999,  hub: '/scp-series-jp' },
      { id: 2, label: 'JP Series II',  min: 1000, max: 1999, hub: '/scp-series-jp-2' },
      { id: 3, label: 'JP Series III', min: 2000, max: 2999, hub: '/scp-series-jp-3' },
      { id: 4, label: 'JP Series IV',  min: 3000, max: 3999, hub: '/scp-series-jp-4' },
      { id: 5, label: 'JP Series V',   min: 4000, max: 4999, hub: '/scp-series-jp-5' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales',       label: '財団Tales-JP',       url: jp('foundation-tales-jp') },
        ]},
      { cat: '特殊SCP',
        items: [
          { id: '001',         label: '001-JP提言',          url: jp('scp-001-jp') },
          { id: 'joke',        label: 'ジョークSCP-JP',       url: jp('joke-scps-jp') },
          { id: 'ex',          label: 'Explained SCP-JP',   url: jp('scp-jp-ex') },
          { id: 'hall',        label: '殿堂入りコレクション',  url: jp('hall-of-fame-jp') },
        ]},
      { cat: 'ログ・記録',
        items: [
          { id: 'anomalous',   label: '異常物品記録-JP',      url: jp('log-of-anomalous-items-jp') },
          { id: 'locations',   label: '未解明領域記録-JP',     url: jp('log-of-unexplained-locations-jp') },
          { id: 'events',      label: '超常現象記録-JP',      url: jp('log-of-extranormal-events-jp') },
        ]},
      { cat: 'GoI・カノン',
        items: [
          { id: 'canon',       label: 'カノンハブ-JP',        url: jp('canon-hub-jp') },
          { id: 'series-hub',  label: '連作ハブ-JP',          url: jp('series-hub-jp') },
          { id: 'goi-format',  label: 'GoIフォーマット-JP',   url: jp('goi-format-jp') },
          { id: 'goi',         label: '要注意団体-JP',        url: jp('groups-of-interest-jp') },
          { id: 'mtf',         label: '機動部隊-JP',          url: jp('task-forces-jp') },
          { id: 'sites',       label: '収容施設一覧-JP',       url: jp('secure-facilities-locations-jp') },
        ]},
      { cat: '翻訳（EN→JP）',
        items: [
          { id: 'en-tales',    label: 'EN Tales翻訳',        url: jp('foundation-tales') },
          { id: 'en-canon',    label: 'ENカノン翻訳',         url: jp('canon-hub') },
          { id: 'en-001',      label: 'EN 001提言翻訳',      url: jp('scp-001') },
        ]},
    ],
  },

  {
    code: 'CN',
    name: 'SCP基金会',
    nativeName: 'SCP基金会',
    language: '简体中文',
    domain: 'http://scp-wiki-cn.wikidot.com',
    urlPattern: 'prefix-cn',
    activeMax: 4000,
    color: '#1a3a1a',
    accent: '#4ad94a',
    series: [
      { id: 1, label: 'CN Series I',   min: 1,    max: 999,  hub: '/scp-series-cn' },
      { id: 2, label: 'CN Series II',  min: 1000, max: 1999, hub: '/scp-series-cn-2' },
      { id: 3, label: 'CN Series III', min: 2000, max: 2999, hub: '/scp-series-cn-3' },
      { id: 4, label: 'CN Series IV',  min: 3000, max: 3999, hub: '/scp-series-cn-4' },
      { id: 5, label: 'CN Series V',   min: 4000, max: 4999, hub: '/scp-series-cn-5' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales',       label: 'Foundation Tales（CN→JP翻訳）', url: jp('foundation-tales') },
          { id: 'tales-list',  label: 'CN Tales一覧（JP）',           url: jp('tales-cn') },
        ]},
      { cat: '特殊SCP',
        items: [
          { id: 'joke',        label: 'Joke SCPs-CN（JP翻訳）',       url: jp('joke-scps-cn') },
        ]},
    ],
  },

  {
    code: 'RU',
    name: 'SCP Фонд',
    nativeName: 'SCP Фонд',
    language: 'Русский',
    domain: 'https://scpfoundation.net',
    urlPattern: 'suffix',
    activeMax: 2195,
    minNumber: 1000,
    color: '#2a1a3a',
    accent: '#9a4ad9',
    series: [
      { id: 1, label: 'RU Series I',  min: 1000, max: 1999, hub: '/scp-list-ru' },
      { id: 2, label: 'RU Series II', min: 2000, max: 2999, hub: '/scp-list-ru' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales', label: 'RU Tales（JP翻訳）', url: jp('tales-ru') },
        ]},
    ],
  },

  {
    code: 'KO',
    name: 'SCP 재단',
    nativeName: 'SCP 재단',
    language: '한국어',
    domain: 'http://scpko.wikidot.com',
    urlPattern: 'suffix',
    activeMax: 1500,
    color: '#1a2a3a',
    accent: '#4a9ad9',
    series: [
      { id: 1, label: 'KO Series I',  min: 1,    max: 999,  hub: '/scp-series-ko' },
      { id: 2, label: 'KO Series II', min: 1000, max: 1999, hub: '/scp-series-ko-2' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales', label: 'KO Tales（JP翻訳）', url: jp('tales-ko') },
        ]},
      { cat: '特殊SCP',
        items: [
          { id: 'joke',  label: 'Joke SCPs-KO（JP翻訳）', url: jp('joke-scps-ko') },
        ]},
    ],
  },

  {
    code: 'ZH',
    name: 'SCP基金會',
    nativeName: 'SCP基金會',
    language: '繁體中文',
    domain: 'http://scp-zh-tr.wikidot.com',
    urlPattern: 'prefix-zh',
    activeMax: 996,
    color: '#3a2a1a',
    accent: '#d9a44a',
    series: [
      { id: 1, label: 'ZH Series I',  min: 1,    max: 999,  hub: '/scp-series-zh' },
      { id: 2, label: 'ZH Series II', min: 1000, max: 1999, hub: '/scp-series-zh-2' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales', label: 'ZH Tales（JP翻訳）', url: jp('tales-zh') },
        ]},
    ],
  },

  {
    code: 'FR',
    name: 'Fondation SCP',
    nativeName: 'Fondation SCP',
    language: 'Français',
    domain: 'http://fondationscp.wikidot.com',
    urlPattern: 'suffix',
    activeMax: 745,
    color: '#1a1a3a',
    accent: '#6a6ad9',
    series: [
      { id: 1, label: 'FR Series I',  min: 1,   max: 499, hub: '/liste-fr' },
      { id: 2, label: 'FR Series II', min: 500, max: 999, hub: '/liste-fr' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales', label: 'FR Tales（JP翻訳）', url: jp('tales-fr') },
        ]},
    ],
  },

  {
    code: 'PL',
    name: 'SCP Polska Filia',
    nativeName: 'SCP Polska Filia',
    language: 'Polski',
    domain: 'http://scp-pl.wikidot.com',
    urlPattern: 'prefix-pl',
    activeMax: 490,
    color: '#3a1a2a',
    accent: '#d94a9a',
    series: [
      { id: 1, label: 'PL Series I',  min: 1,   max: 499, hub: '/lista-pl' },
      { id: 2, label: 'PL Series II', min: 500, max: 999, hub: '/lista-pl' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales', label: 'PL Tales（JP翻訳）', url: jp('tales-pl') },
        ]},
    ],
  },

  {
    code: 'ES',
    name: 'La Fundación SCP',
    nativeName: 'La Fundación SCP',
    language: 'Español',
    domain: 'http://lafundacionscp.wikidot.com',
    urlPattern: 'suffix',
    activeMax: 344,
    color: '#3a2a1a',
    accent: '#d9844a',
    series: [
      { id: 1, label: 'ES Series I',   min: 1,    max: 499,  hub: '/serie-scp-es' },
      { id: 2, label: 'ES Series II',  min: 500,  max: 999,  hub: '/serie-scp-es-2' },
      { id: 3, label: 'ES Series III', min: 1000, max: 1499, hub: '/serie-scp-es-3' },
      { id: 4, label: 'ES Series IV',  min: 1500, max: 1999, hub: '/serie-scp-es-4' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales', label: 'ES Tales（JP翻訳）', url: jp('tales-es') },
        ]},
    ],
  },

  {
    code: 'TH',
    name: 'สถาบัน SCP',
    nativeName: 'สถาบัน SCP',
    language: 'ภาษาไทย',
    domain: 'http://scp-th.wikidot.com',
    urlPattern: 'suffix',
    activeMax: 655,
    color: '#2a2a1a',
    accent: '#d9d44a',
    series: [
      { id: 1, label: 'TH Series I',  min: 1,   max: 499, hub: '/scp-series-th' },
      { id: 2, label: 'TH Series II', min: 500, max: 999, hub: '/scp-series-th' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales', label: 'TH Tales（JP翻訳）', url: jp('tales-th') },
        ]},
    ],
  },

  {
    code: 'VN',
    name: 'Tổ Chức SCP',
    nativeName: 'Tổ Chức SCP',
    language: 'Tiếng Việt',
    domain: 'http://scp-vn.wikidot.com',
    urlPattern: 'suffix',
    activeMax: 200,
    color: '#1a3a2a',
    accent: '#4ad98a',
    series: [
      { id: 1, label: 'VN Series I',  min: 1,   max: 499, hub: '/scp-series-vn' },
      { id: 2, label: 'VN Series II', min: 500, max: 999, hub: '/scp-series-vn-2' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales', label: 'VN Tales（JP翻訳）', url: jp('tales-vn') },
        ]},
    ],
  },

  {
    code: 'DE',
    name: 'SCP auf Deutsch',
    nativeName: 'SCP auf Deutsch',
    language: 'Deutsch',
    domain: 'http://scp-wiki-de.wikidot.com',
    urlPattern: 'suffix',
    activeMax: 400,
    color: '#2a2a2a',
    accent: '#aaaaaa',
    series: [
      { id: 1, label: 'DE Series I',  min: 1,   max: 499, hub: '/scp-serie-de' },
      { id: 2, label: 'DE Series II', min: 500, max: 999, hub: '/scp-serie-de' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales', label: 'DE Tales（JP翻訳）', url: jp('tales-de') },
        ]},
    ],
  },

  {
    code: 'IT',
    name: 'Fondazione SCP',
    nativeName: 'Fondazione SCP',
    language: 'Italiano',
    domain: 'http://fondazionescp.wikidot.com',
    urlPattern: 'suffix',
    activeMax: 170,
    color: '#3a2a1a',
    accent: '#d9aa4a',
    series: [
      { id: 1, label: 'IT Series I', min: 1, max: 499, hub: '/scp-it-serie-i' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales', label: 'IT Tales（JP翻訳）', url: jp('tales-it') },
        ]},
    ],
  },

  {
    code: 'PT',
    name: 'Fundação SCP',
    nativeName: 'Fundação SCP Lusófona',
    language: 'Português',
    domain: 'http://scp-pt-br.wikidot.com',
    urlPattern: 'suffix',
    activeMax: 170,
    color: '#1a3a1a',
    accent: '#4ad94a',
    series: [
      { id: 1, label: 'PT Series I',  min: 1,   max: 249, hub: '/series-1-pt' },
      { id: 2, label: 'PT Series II', min: 250, max: 499, hub: '/series-2-pt' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales', label: 'PT Tales（JP翻訳）', url: jp('tales-pt') },
        ]},
    ],
  },

  {
    code: 'UA',
    name: 'Укр. Фонд SCP',
    nativeName: 'Український Фонд SCP',
    language: 'Українська',
    domain: 'http://scp-ukrainian.wikidot.com',
    urlPattern: 'suffix',
    activeMax: 198,
    color: '#1a2a3a',
    accent: '#4a9ad9',
    series: [
      { id: 1, label: 'UA Series I', min: 1, max: 499, hub: '/scp-series-ua' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales', label: 'UA Tales（JP翻訳）', url: jp('tales-ua') },
        ]},
    ],
  },

  {
    code: 'CS',
    name: 'SCP Nadace',
    nativeName: 'SCP Nadace',
    language: 'Čeština / Slovenčina',
    domain: 'http://scp-cs.wikidot.com',
    urlPattern: 'suffix',
    activeMax: 40,
    color: '#2a2a3a',
    accent: '#6a6ad9',
    series: [
      { id: 1, label: 'CS Series I', min: 1, max: 199, hub: '/scp-series-cs' },
    ],
    hubs: [
      { cat: 'Tales・物語',
        items: [
          { id: 'tales', label: 'CS Tales（JP翻訳）', url: jp('tales-cs') },
        ]},
    ],
  },
]

export const BRANCH_MAP = Object.fromEntries(BRANCHES.map(b => [b.code, b]))

export function getBranch(code) {
  return BRANCH_MAP[code]
}
