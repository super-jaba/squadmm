import { MatchStrength } from './models.js'

// HTML-escaped by `html` unless already wrapped in Html
class Html {
  constructor(readonly value: string) {}
}

type Value = Html | string | number | false | null | undefined | readonly Value[]

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function render(value: Value): string {
  if (value === null || value === undefined || value === false) return ''
  if (value instanceof Html) return value.value
  if (Array.isArray(value)) return value.map(render).join('')
  return escape(String(value))
}

// Tagged template: every interpolation is escaped, nested html`` fragments and arrays of them are not
function html(strings: TemplateStringsArray, ...values: Value[]): Html {
  return new Html(strings.reduce((out, s, i) => out + s + (i < values.length ? render(values[i]) : ''), ''))
}

export type StrengthCounts = Record<MatchStrength, number>

export type RecruiterRow = StrengthCounts & {
  id: string
  name: string | null
  email: string | null
  active: boolean | null
  lastLogin: Date | null
}

export type Recruiter = {
  id: string
  name: string | null
  email: string | null
  active: boolean | null
  lastLogin: Date | null
  createdAt: Date | null
  roleTypes: string[] // Tech / Non-tech
  locations: string[]
  specialties: string[]
  freeText: string | null
  asked: boolean // false => the preferences weren't collected from the recruiter
}

export type MatchRow = {
  roleId: string
  strength: MatchStrength
  reasoning: string | null
  model: string | null // null when decided without an LLM call
  promptVersion: string | null
  matchedAt: Date
  title: string | null
  company: string | null
  comp: string | null
  roleType: string | null
  requiredLocation: string | null
  skills: string[]
}

export type MatchListRow = {
  userId: string
  recruiter: string | null
  roleId: string
  title: string | null
  company: string | null
  strength: MatchStrength
  matchedAt: Date
}

export type StrengthOrder = 'strongest' | 'weakest'

export type RoleDetail = {
  id: string
  internalId: number | null // the "ID" shown in the dashboard
  title: string | null
  statusInternal: string | null
  rolePriority: string | null
  isAcceptingNewSubmissions: boolean | null
  roleType: string | null
  requiredLocation: string | null
  requiredOverlap: string | null
  continents: string | null
  countries: string | null
  comp: string | null // free text
  maxCompensation: string | null
  enhancedJd: string | null // markdown
  requirementsStructured: string | null // "Must have: …. Priority: High, Nice to have: …"
  keyIndicators: string[]
  skills: string[]
  createdAt: Date | null
  updatedAt: Date | null
  deletedAt: Date | null
  company: string | null
  segment: string | null
  companyUrl: string | null
}

const CSS = `
:root {
  --bg: #f7f7f8; --surface: #fff; --text: #1d1d1f; --muted: #6b6b73; --border: #e2e2e6; --link: #2557d6;
  --strong-bg: #dcf5e3; --strong-fg: #146c2e; --medium-bg: #fdf0d2; --medium-fg: #8a5a00; --weak-bg: #ececef; --weak-fg: #55555c;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #141416; --surface: #1d1d20; --text: #ececef; --muted: #9a9aa3; --border: #313136; --link: #7fa2ff;
    --strong-bg: #173a24; --strong-fg: #8fe0a8; --medium-bg: #3d3115; --medium-fg: #f2c56b; --weak-bg: #2a2a2e; --weak-fg: #b5b5bc;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, -apple-system, sans-serif; }
a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }
header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 12px 16px; }
header nav { display: flex; gap: 20px; max-width: 960px; margin: 0 auto; }
header a { color: var(--text); font-weight: 600; }
td a.cell { display: block; color: inherit; }
tr.link:hover td { background: var(--bg); }
tr.link:hover a.cell { text-decoration: none; }
th a { color: inherit; }
main { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { font-size: 24px; margin: 0 0 4px; }
h2 { font-size: 17px; margin: 32px 0 12px; }
.muted { color: var(--muted); }
.panel { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.search { display: flex; gap: 8px; margin: 16px 0; }
input[type=search] { flex: 1; padding: 8px 10px; font: inherit; color: inherit; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; }
button { padding: 8px 14px; font: inherit; color: inherit; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; }
.table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
th { font-size: 13px; font-weight: 600; color: var(--muted); }
tr:last-child td { border-bottom: none; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
.badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; letter-spacing: .02em; }
.STRONG { background: var(--strong-bg); color: var(--strong-fg); }
.MEDIUM { background: var(--medium-bg); color: var(--medium-fg); }
.WEAK { background: var(--weak-bg); color: var(--weak-fg); }
dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 0; }
dt { color: var(--muted); }
dd { margin: 0; }
.filter { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 16px; }
.filter label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.match { display: block; margin-bottom: 12px; color: inherit; }
a.match:hover { text-decoration: none; border-color: var(--link); }
a.match:hover .match-title { color: var(--link); }
.match-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
.match-title { font-weight: 600; }
.match dl { margin-top: 12px; font-size: 14px; }
.match .reasoning { white-space: pre-line; }
.footer { font-size: 12px; color: var(--muted); }
.jd h3 { font-size: 15px; margin: 16px 0 4px; }
.jd p { margin: 8px 0; }
.jd ul, .reqs { margin: 4px 0 8px; padding-left: 20px; }
.reqs li { margin-bottom: 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { padding: 1px 8px; border: 1px solid var(--border); border-radius: 999px; font-size: 13px; }
`

function layout(title: string, body: Html): string {
  return render(html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · squadmm</title>
<style>${new Html(CSS)}</style>
</head>
<body>
<header><nav><a href="/">Recruiters</a><a href="/matches">Matches</a></nav></header>
<main>${body}</main>
</body>
</html>`)
}

function date(d: Date | null): string {
  // Columns are timestamp without time zone, parsed as local time: format in local time too (YYYY-MM-DD)
  return d ? d.toLocaleDateString('en-CA') : '—'
}

function list(values: string[]): string {
  return values.length ? values.join(', ') : '—'
}

function recruiterUrl(id: string, strengths?: MatchStrength[]): string {
  const params = new URLSearchParams(strengths?.map((s) => ['strength', s]))
  return `/recruiters/${encodeURIComponent(id)}${params.size ? `?${params}` : ''}`
}

export function notFoundPage(message: string): string {
  return layout('Not found', html`<h1>Not found</h1><p class="muted">${message}</p><p><a href="/">Back to recruiters</a></p>`)
}

export function errorPage(): string {
  return layout('Error', html`<h1>Something went wrong</h1><p class="muted">See the server log for details.</p>`)
}

export function recruiterListPage(rows: RecruiterRow[], q: string): string {
  const body = html`
<h1>Recruiters</h1>
<p class="muted">${rows.length} ${q ? 'found' : 'recruiters'}, most strong matches first</p>
<form class="search" method="get" action="/">
  <input type="search" name="q" value="${q}" placeholder="Search by name or email" autofocus>
  <button type="submit">Search</button>
  ${q && html`<a href="/" style="align-self:center">Clear</a>`}
</form>
<div class="table-wrap">
<table>
  <thead><tr>
    <th>Name</th><th>Email</th><th>Active</th><th>Last login</th>
    ${MatchStrength.options.map((s) => html`<th class="num"><span class="badge ${s}">${s}</span></th>`)}
  </tr></thead>
  <tbody>
  ${rows.map(
    (r) => html`<tr>
    <td><a href="${recruiterUrl(r.id)}">${r.name ?? 'Unnamed'}</a></td>
    <td class="muted">${r.email ?? '—'}</td>
    <td>${r.active === false ? 'no' : 'yes'}</td>
    <td class="muted">${date(r.lastLogin)}</td>
    ${MatchStrength.options.map((s) => html`<td class="num${r[s] ? '' : ' muted'}">${r[s]}</td>`)}
  </tr>`,
  )}
  ${rows.length === 0 && html`<tr><td colspan="7" class="muted">No recruiters match “${q}”.</td></tr>`}
  </tbody>
</table>
</div>`
  return layout('Recruiters', body)
}

export function matchListPage(rows: MatchListRow[], order: StrengthOrder): string {
  const flip: StrengthOrder = order === 'strongest' ? 'weakest' : 'strongest'
  const body = html`
<h1>Matches</h1>
<p class="muted">${rows.length} matches, ${order} first. Click a match to open its recruiter.</p>
<div class="table-wrap" style="margin-top:16px">
<table>
  <thead><tr>
    <th><a href="/matches?order=${flip}" title="Sort ${flip} first">Strength ${order === 'strongest' ? '↓' : '↑'}</a></th>
    <th>Recruiter</th><th>Role</th><th>Company</th><th>Matched on</th>
  </tr></thead>
  <tbody>
  ${rows.map((m) => {
    const href = recruiterUrl(m.userId)
    return html`<tr class="link">
    <td><a class="cell" href="${href}"><span class="badge ${m.strength}">${m.strength}</span></a></td>
    <td><a class="cell" href="${href}">${m.recruiter ?? 'Unnamed'}</a></td>
    <td><a class="cell" href="${href}">${m.title ?? 'Untitled role'}</a></td>
    <td><a class="cell muted" href="${href}">${m.company ?? '—'}</a></td>
    <td><a class="cell muted" href="${href}">${date(m.matchedAt)}</a></td>
  </tr>`
  })}
  ${rows.length === 0 && html`<tr><td colspan="5" class="muted">No matches yet.</td></tr>`}
  </tbody>
</table>
</div>`
  return layout('Matches', body)
}

export function recruiterPage(recruiter: Recruiter, matches: MatchRow[], counts: StrengthCounts, selected: MatchStrength[]): string {
  const total = MatchStrength.options.reduce((sum, s) => sum + counts[s], 0)
  const filtered = selected.length < MatchStrength.options.length

  const body = html`
<p><a href="/">← All recruiters</a></p>
<h1>${recruiter.name ?? 'Unnamed recruiter'}</h1>
<p class="muted">${recruiter.email ?? 'no email'}</p>

<h2>Profile</h2>
<div class="panel">
<dl>
  <dt>Status</dt><dd>${recruiter.active === false ? 'Inactive' : 'Active'}</dd>
  <dt>Joined</dt><dd>${date(recruiter.createdAt)}</dd>
  <dt>Last login</dt><dd>${date(recruiter.lastLogin)}</dd>
  <dt>Role types</dt><dd>${list(recruiter.roleTypes)}</dd>
  <dt>Locations</dt><dd>${list(recruiter.locations)}</dd>
  <dt>Specialties</dt><dd>${list(recruiter.specialties)}</dd>
  <dt>Notes</dt><dd>${recruiter.freeText ?? '—'}</dd>
</dl>
${!recruiter.asked && html`<p class="footer" style="margin:12px 0 0">Preferences weren't asked from this recruiter, so the judge treats them as a weak signal.</p>`}
</div>

<h2>Matches <span class="muted">${filtered ? `${matches.length} of ${total}` : total}</span></h2>
<form class="filter" method="get" action="${recruiterUrl(recruiter.id)}">
  ${MatchStrength.options.map(
    (s) => html`<label><input type="checkbox" name="strength" value="${s}" ${selected.includes(s) && 'checked'}>
    <span class="badge ${s}">${s}</span> <span class="muted">${counts[s]}</span></label>`,
  )}
  <button type="submit">Apply</button>
  ${filtered && html`<a href="${recruiterUrl(recruiter.id)}">Show all</a>`}
</form>
${matches.map(matchCard)}
${matches.length === 0 && html`<div class="panel muted">${total === 0 ? 'No matches for this recruiter yet.' : 'No matches at the selected strength.'}</div>`}`
  return layout(recruiter.name ?? 'Recruiter', body)
}

function matchCard(m: MatchRow): Html {
  return html`<a class="panel match" href="/roles/${encodeURIComponent(m.roleId)}" target="_blank" rel="noopener">
  <div class="match-head">
    <span class="badge ${m.strength}">${m.strength}</span>
    <span class="match-title">${m.title ?? 'Untitled role'} ↗</span>
  </div>
  <dl>
    <dt>Match strength</dt><dd>${m.strength}</dd>
    <dt>Company</dt><dd>${m.company ?? '—'}</dd>
    <dt>Compensation</dt><dd>${m.comp?.trim() || '—'}</dd>
    <dt>Location</dt><dd>${m.requiredLocation?.trim() || '—'}</dd>
    <dt>Arrangement</dt><dd>${m.roleType?.trim() || '—'}</dd>
    <dt>Skills</dt><dd>${list(m.skills)}</dd>
    <dt>Reasoning</dt><dd class="reasoning">${m.reasoning ?? '—'}</dd>
    <dt>Matched on</dt><dd>${date(m.matchedAt)}</dd>
    <dt>Judged by</dt><dd>${m.model ? `${m.model}, prompt ${m.promptVersion ?? '?'}` : 'No LLM call (recruiter has no history or preferences)'}</dd>
    <dt>Role ID</dt><dd class="muted">${m.roleId}</dd>
  </dl>
</a>`
}

export function rolePage(role: RoleDetail): string {
  const location = [role.requiredLocation, role.continents, role.countries].filter((f): f is string => !!f?.trim())
  const requirements = parseRequirements(role.requirementsStructured)
  const companyUrl = role.companyUrl && /^https?:\/\//i.test(role.companyUrl) ? role.companyUrl : null

  const body = html`
<h1>${role.title ?? 'Untitled role'}</h1>
<p class="muted">
  ${companyUrl ? html`<a href="${companyUrl}" target="_blank" rel="noopener">${role.company ?? companyUrl}</a>` : (role.company ?? 'unknown company')}
  ${role.segment && ` · ${role.segment}`}
  ${role.internalId !== null && ` · #${role.internalId}`}
</p>

<h2>Overview</h2>
<div class="panel">
<dl>
  <dt>Status</dt><dd>${role.deletedAt ? `Deleted ${date(role.deletedAt)}` : (role.statusInternal ?? '—')}</dd>
  <dt>Accepting submissions</dt><dd>${role.isAcceptingNewSubmissions === null ? '—' : role.isAcceptingNewSubmissions ? 'Yes' : 'No'}</dd>
  <dt>Priority</dt><dd>${role.rolePriority ?? '—'}</dd>
  <dt>Arrangement</dt><dd>${role.roleType ?? '—'}</dd>
  <dt>Location</dt><dd>${location.length ? location.join(' · ') : '—'}</dd>
  <dt>Overlap</dt><dd>${role.requiredOverlap ?? '—'}</dd>
  <dt>Compensation</dt><dd>${role.comp ?? '—'}${role.maxCompensation && html` <span class="muted">(max ${role.maxCompensation})</span>`}</dd>
  <dt>Created</dt><dd>${date(role.createdAt)}</dd>
  <dt>Updated</dt><dd>${date(role.updatedAt)}</dd>
</dl>
</div>

${role.skills.length > 0 && html`<h2>Skills</h2><div class="chips">${role.skills.map((s) => html`<span class="chip">${s}</span>`)}</div>`}
${role.keyIndicators.length > 0 && html`<h2>Key indicators</h2><div class="chips">${role.keyIndicators.map((s) => html`<span class="chip">${s}</span>`)}</div>`}

${requirements.length > 0 && html`<h2>Requirements</h2><div class="panel"><ul class="reqs">${requirements.map(
    (r) => html`<li><strong>${r.kind}:</strong> ${r.text}${r.priority && html` <span class="muted">(${r.priority})</span>`}</li>`,
  )}</ul></div>`}
${requirements.length === 0 && role.requirementsStructured && html`<h2>Requirements</h2><div class="panel"><p style="margin:0;white-space:pre-line">${role.requirementsStructured}</p></div>`}

<h2>Job description</h2>
<div class="panel jd">${role.enhancedJd ? markdown(role.enhancedJd) : html`<span class="muted">No job description.</span>`}</div>`
  return layout(role.title ?? 'Role', body)
}

type Requirement = { kind: string; text: string; priority: string | null }

// "Must have: X. Priority: High, Nice to have: Y. Priority: Low" → items; [] if it doesn't follow that shape
function parseRequirements(text: string | null): Requirement[] {
  if (!text) return []
  const items = text.split(/, (?=(?:Must have|Nice to have): )/).map((item) => {
    const m = /^(Must have|Nice to have): ([\s\S]*?)(?:\.? Priority: (\w+))?\.?$/.exec(item.trim())
    return m ? { kind: m[1] ?? '', text: m[2] ?? '', priority: m[3] ?? null } : null
  })
  return items.every((i) => i !== null) ? items : []
}

// Minimal markdown for job descriptions: #-headings, -/* bullets, **bold**, _italic_ and paragraphs.
// Text is escaped first, so the source can't inject HTML.
function markdown(text: string): Html {
  const inline = (line: string) =>
    escape(line)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(>])_(\S(?:.*?\S)?)_(?=[\s.,;:)<]|$)/g, '$1<em>$2</em>')
      .replace(/\\([\\`*_#+\-.!()[\]])/g, '$1') // markdown escapes like "1\."

  const out: string[] = []
  let paragraph: string[] = []
  let bullets: string[] = []
  const flush = () => {
    if (paragraph.length) out.push(`<p>${paragraph.join('<br>')}</p>`)
    if (bullets.length) out.push(`<ul>${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`)
    paragraph = []
    bullets = []
  }

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    const bullet = /^[-*•]\s+(.*)$/.exec(line)
    if (!line) flush()
    else if (heading) {
      flush()
      out.push(`<h3>${inline(heading[1] ?? '')}</h3>`)
    } else if (bullet) {
      if (paragraph.length) flush()
      bullets.push(inline(bullet[1] ?? ''))
    } else {
      if (bullets.length) flush()
      paragraph.push(inline(line))
    }
  }
  flush()
  return new Html(out.join('\n'))
}
