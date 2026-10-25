import fs from 'node:fs';
import path from 'node:path';

import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';

import { breakerBanner, breakerTripped } from '../support/breaker';
import { FINDINGS_ATTACHMENT, type Finding, type FindingType, type TestFindings } from '../support/findings';

/**
 * Aggregates the per-test findings into
 *   responsive-report/findings.json   (machine readable, everything)
 *   responsive-report/summary.md      (human readable: worst routes, then route by route)
 *
 * Grouping: route -> finding type -> (selector) with the list of devices affected and the
 * screenshot paths. Screenshots live in responsive-report/screenshots/**.
 */

interface Row {
  persona: string;
  route: string;
  openedPath: string;
  device: string;
  group: 'mobile' | 'desktop';
  screenshot?: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  skipReason?: string;
  errorMessage?: string;
  findings: Finding[];
  durationMs: number;
}

interface MergedFinding {
  type: FindingType;
  severity: Finding['severity'];
  selector?: string;
  detail: string;
  devices: string[];
  screenshots: Record<string, string>;
  data?: Record<string, unknown>;
}

interface RouteReport {
  persona: string;
  route: string;
  openedPath: string;
  devicesRun: string[];
  devicesFailed: string[];
  hardOccurrences: number;
  softOccurrences: number;
  findings: MergedFinding[];
}

const NEWLINE = /\r?\n/;

const reportDir =() => path.resolve(process.env.RESPONSIVE_REPORT_DIR ?? 'responsive-report');

const TYPE_TITLES: Record<string, string> = {
  'horizontal-overflow': 'Horizontal overflow / cut-off content',
  'occluded-clickable': 'Occluded clickables',
  'nav-unreachable': 'Mobile menu items unreachable',
  'nav-not-closable': 'Mobile menu does not close',
  'nav-missing': 'Mobile menu toggle missing',
  'overlay-cut-off': 'Dialog / drawer cut off',
  'overlay-close-unreachable': 'Dialog close control unreachable',
  'clipped-text': 'Clipped text (soft)',
  'tap-target': 'Tap targets under 44x44 (soft)',
  'fixed-overlap': 'Fixed / sticky overlap (soft)',
  'content-under-fixed': 'Content hidden under fixed bars (soft)',
  'page-error': 'Page errors (not layout)',
  redirected: 'Redirected routes (informational)',
  'forbidden-for-role': 'Forbidden for this role (informational, not measured)',
  'blocked-by-modal': 'Page blocked by a modal (informational, layout of the page behind it not judged)',
  note: 'Notes',
  'blocked-mutation': 'Requests blocked by the read-only guard',
  'suite-error': 'Suite errors (the check itself crashed or timed out)',
};

const SEVERITY_WEIGHT = { hard: 3, soft: 1, info: 0 } as const;

export default class FindingsReporter implements Reporter {
  private rows: Row[] = [];
  private prepared = false;
  private setupNotes: string[] = [];
  private started = 0;
  private projectNames: string[] = [];
  private workers = 0;
  private blocked = new Map<string, number>();

  onBegin(config: FullConfig, suite: Suite): void {
    this.started = Date.now();
    this.workers = config.workers;
    this.projectNames = config.projects.map((p) => p.name).filter((n) => !n.startsWith('setup'));
    void suite;
    // Deliberately NOT touching responsive-report/ here: `--list` and a run that dies in global
    // setup (dead server) never run a test, and must leave the previous report alone. The
    // directory is prepared lazily by `prepare()` on the first finished test.
  }

  /** Wipes (or, with RESPONSIVE_REPORT_KEEP=1, re-reads) the report dir once, when the first test ends. */
  private prepare(): void {
    if (this.prepared) return;
    this.prepared = true;
    if (process.env.RESPONSIVE_REPORT_KEEP !== '1') fs.rmSync(reportDir(), { recursive: true, force: true });
    fs.mkdirSync(reportDir(), { recursive: true });
    // Rows are appended to rows.ndjson as tests finish, so a run that dies half way (or several
    // invocations, one per device) still produces a complete report with RESPONSIVE_REPORT_KEEP=1.
    const rowsFile = path.join(reportDir(), 'rows.ndjson');
    if (process.env.RESPONSIVE_REPORT_KEEP === '1' && fs.existsSync(rowsFile)) {
      for (const line of fs.readFileSync(rowsFile, 'utf8').split(NEWLINE)) {
        if (!line.trim()) continue;
        try {
          this.rows.push(JSON.parse(line) as Row);
        } catch {
          // A half-written last line is ignored.
        }
      }
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.prepare();
    const project = test.parent.project()?.name ?? '';
    if (project.startsWith('setup')) {
      for (const a of test.annotations) {
        if (a.type === 'auth-failed') this.setupNotes.push(`Login failed - ${a.description}`);
        if (a.type === 'warm-up') this.setupNotes.push(`Warm-up - ${a.description}`);
        if (a.type === 'skip' && a.description) this.setupNotes.push(`${test.title}: skipped - ${a.description}`);
      }
      if (result.status === 'failed' || result.status === 'timedOut') {
        this.setupNotes.push(`${test.title}: ${result.status} - ${(result.error?.message ?? '').split('\n')[0].slice(0, 200)}`);
      }
      return;
    }

    const titlePath = test.titlePath();
    const persona = titlePath[3] ?? 'unknown';
    const attachment = result.attachments.find((a) => a.name === FINDINGS_ATTACHMENT && a.body);
    let payload: TestFindings | null = null;
    if (attachment?.body) {
      try {
        payload = JSON.parse(attachment.body.toString('utf8')) as TestFindings;
      } catch {
        payload = null;
      }
    }

    const skip = test.annotations.find((a) => a.type === 'skip');
    const row: Row = {
      persona: payload?.persona ?? persona,
      route: payload?.route ?? test.title,
      openedPath: payload?.openedPath ?? test.title,
      device: payload?.device ?? project,
      group: payload?.group ?? 'mobile',
      screenshot: payload?.screenshot,
      status: result.status === 'skipped' ? 'skipped' : result.status,
      skipReason: result.status === 'skipped' ? skip?.description : undefined,
      findings: payload?.findings ? [...payload.findings] : [],
      durationMs: result.duration,
    };

    if ((result.status === 'timedOut' || result.status === 'failed') && !payload) {
      row.errorMessage = (result.error?.message ?? '').split('\n').slice(0, 3).join(' ').slice(0, 300);
      row.findings.push({
        type: 'suite-error',
        severity: 'soft',
        detail: `${result.status}: ${row.errorMessage}`,
      });
    }
    this.rows.push(row);
    fs.appendFileSync(path.join(reportDir(), 'rows.ndjson'), JSON.stringify(row) + String.fromCharCode(10));
  }

  onEnd(result: FullResult): void {
    // Nothing ran (`--list`, or global setup failed): leave the previous report untouched.
    if (!this.prepared) {
      if (breakerTripped()) console.error(breakerBanner());
      return;
    }
    // The same test can appear twice (a retry that was appended, or two overlapping runs): keep the last.
    const latest = new Map<string, Row>();
    for (const row of this.rows) latest.set(row.persona + "|" + row.route + "|" + row.device, row);
    this.rows = [...latest.values()];
    const dir = reportDir();
    const routes = this.buildRoutes();
    const skipped = this.rows.filter((r) => r.status === 'skipped');
    const ran = this.rows.filter((r) => r.status !== 'skipped');
    const durationMs = Date.now() - this.started;

    const countsByType: Record<string, { occurrences: number; routes: number }> = {};
    for (const r of routes) {
      const seen = new Set<string>();
      for (const f of r.findings) {
        const c = (countsByType[f.type] ??= { occurrences: 0, routes: 0 });
        c.occurrences += f.devices.length;
        if (!seen.has(f.type)) {
          c.routes++;
          seen.add(f.type);
        }
      }
    }

    const json = {
      generatedAt: new Date().toISOString(),
      status: result.status,
      durationMs,
      workers: this.workers,
      projects: this.projectNames,
      totals: {
        testsRun: ran.length,
        testsSkipped: skipped.length,
        testsFailedOnHardFindings: ran.filter((r) => r.status === 'failed').length,
        routesWithHardFindings: routes.filter((r) => r.hardOccurrences > 0).length,
        routes: routes.length,
      },
      countsByType,
      setupNotes: this.setupNotes,
      blockedRequests: Object.fromEntries([...this.blocked.entries()].sort((a, b) => b[1] - a[1])),
      skipped: this.groupSkips(skipped),
      routes,
    };
    fs.writeFileSync(path.join(dir, 'findings.json'), JSON.stringify(json, null, 2));
    fs.writeFileSync(path.join(dir, 'summary.md'), this.renderSummary(json, routes, skipped));
    console.log(`\nResponsive report: ${path.join(dir, 'summary.md')}`);
    if (breakerTripped()) console.error(breakerBanner());
  }

  // ---- aggregation ------------------------------------------------------------------------

  private buildRoutes(): RouteReport[] {
    const byRoute = new Map<string, Row[]>();
    for (const r of this.rows) {
      if (r.status === 'skipped') continue;
      const key = `${r.persona} ${r.route}`;
      byRoute.set(key, [...(byRoute.get(key) ?? []), r]);
    }
    const out: RouteReport[] = [];
    for (const rows of byRoute.values()) {
      const merged = new Map<string, MergedFinding>();
      let hard = 0;
      let soft = 0;
      for (const row of rows) {
        for (const f of row.findings) {
          if (f.type === 'blocked-mutation') {
            // Same few endpoints on every page: summarised once instead of per route.
            const key = f.detail.replace(/^A /, '').replace(/ request was aborted by the read-only guard:/, '').replace(/\?.*$/, '');
            this.blocked.set(key, (this.blocked.get(key) ?? 0) + 1);
            continue;
          }
          if (f.severity === 'hard') hard++;
          if (f.severity === 'soft' && f.type !== 'page-error') soft++;
          const key = `${f.type}|${f.selector ?? ''}`;
          const existing = merged.get(key);
          if (existing) {
            if (!existing.devices.includes(row.device)) existing.devices.push(row.device);
            if (row.screenshot) existing.screenshots[row.device] = row.screenshot;
          } else {
            merged.set(key, {
              type: f.type,
              severity: f.severity,
              selector: f.selector,
              detail: f.detail,
              devices: [row.device],
              screenshots: row.screenshot ? { [row.device]: row.screenshot } : {},
              data: f.data,
            });
          }
        }
      }
      const first = rows[0];
      out.push({
        persona: first.persona,
        route: first.route,
        openedPath: first.openedPath,
        devicesRun: rows.map((r) => r.device),
        devicesFailed: rows.filter((r) => r.status === 'failed' || r.status === 'timedOut').map((r) => r.device),
        hardOccurrences: hard,
        softOccurrences: soft,
        findings: [...merged.values()].sort(
          (a, b) =>
            SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity] ||
            b.devices.length - a.devices.length,
        ),
      });
    }
    return out.sort((a, b) => b.hardOccurrences - a.hardOccurrences || b.softOccurrences - a.softOccurrences);
  }

  private groupSkips(skipped: Row[]): Array<{ persona: string; route: string; reason: string; devices: number }> {
    const map = new Map<string, { persona: string; route: string; reason: string; devices: number }>();
    for (const s of skipped) {
      const reason = s.skipReason ?? 'skipped';
      const key = `${s.persona}|${s.route}|${reason}`;
      const cur = map.get(key);
      if (cur) cur.devices++;
      else map.set(key, { persona: s.persona, route: s.route, reason, devices: 1 });
    }
    return [...map.values()];
  }

  // ---- markdown ---------------------------------------------------------------------------

  private renderSummary(
    json: { totals: Record<string, number>; countsByType: Record<string, { occurrences: number; routes: number }>; durationMs: number; projects: string[] },
    routes: RouteReport[],
    skipped: Row[],
  ): string {
    const L: string[] = [];
    const mins = (json.durationMs / 60000).toFixed(1);
    L.push('# Responsive sweep summary', '');
    L.push(`- Devices (${json.projects.length}): ${json.projects.join(', ')}`);
    L.push(`- Tests run: ${json.totals.testsRun} | skipped: ${json.totals.testsSkipped} | failed on hard findings: ${json.totals.testsFailedOnHardFindings}`);
    L.push(`- Routes: ${json.totals.routes} | with hard findings: ${json.totals.routesWithHardFindings}`);
    L.push(`- Duration: ${mins} min`, '');

    if (this.setupNotes.length) {
      L.push('## Setup notes', '');
      for (const n of [...new Set(this.setupNotes)]) L.push(`- ${n}`);
      L.push('');
    }

    L.push('## Findings by type', '', '| Type | Severity | Occurrences (route x device) | Routes |', '| --- | --- | ---: | ---: |');
    const order = Object.keys(TYPE_TITLES);
    const hardTypes = new Set(['horizontal-overflow', 'occluded-clickable', 'nav-unreachable', 'nav-not-closable', 'nav-missing', 'overlay-cut-off', 'overlay-close-unreachable']);
    for (const type of order) {
      const c = json.countsByType[type];
      if (!c) continue;
      L.push(`| ${TYPE_TITLES[type]} | ${hardTypes.has(type) ? 'hard' : type === 'redirected' || type === 'forbidden-for-role' || type === 'blocked-by-modal' || type === 'blocked-mutation' || type === 'note' ? 'info' : 'soft'} | ${c.occurrences} | ${c.routes} |`);
    }
    L.push('');

    const worst = routes.filter((r) => r.hardOccurrences > 0).slice(0, 15);
    L.push('## Worst routes (hard findings, route x device)', '');
    if (!worst.length) L.push('No hard findings.', '');
    else {
      L.push('| # | Persona | Route | Hard | Soft | Devices failing |', '| ---: | --- | --- | ---: | ---: | --- |');
      worst.forEach((r, i) => {
        L.push(`| ${i + 1} | ${r.persona} | \`${r.route}\` | ${r.hardOccurrences} | ${r.softOccurrences} | ${r.devicesFailed.join(', ') || '-'} |`);
      });
      L.push('');
    }

    const errors = routes.flatMap((r) => r.findings.filter((f) => f.type === 'page-error').map((f) => ({ r, f })));
    if (errors.length) {
      L.push('## Page errors (separate category, not layout bugs)', '');
      for (const { r, f } of errors.slice(0, 80)) {
        L.push(`- ${r.persona} \`${r.openedPath}\` - ${f.detail} (${f.devices.length} device(s))`);
      }
      if (errors.length > 80) L.push(`- ... ${errors.length - 80} more in findings.json`);
      L.push('');
    }

    L.push('## Routes with hard findings', '');
    for (const r of routes.filter((x) => x.hardOccurrences > 0)) {
      L.push(`### ${r.persona} \`${r.route}\`${r.openedPath !== r.route ? ` (opened \`${r.openedPath}\`)` : ''}`, '');
      const hards = r.findings.filter((f) => f.severity === 'hard');
      const byType = new Map<string, MergedFinding[]>();
      for (const f of hards) byType.set(f.type, [...(byType.get(f.type) ?? []), f]);
      for (const [type, list] of byType) {
        L.push(`**${TYPE_TITLES[type] ?? type}**`, '');
        for (const f of list.slice(0, 6)) {
          const shots = Object.entries(f.screenshots).slice(0, 2).map(([d, s]) => `[${d}](${s})`).join(', ');
          L.push(`- \`${f.selector ?? '-'}\` - ${f.detail}`);
          L.push(`  - Devices (${f.devices.length}): ${f.devices.join(', ')}${shots ? ` - screenshots: ${shots}` : ''}`);
        }
        if (list.length > 6) L.push(`- ... ${list.length - 6} more of this type (see findings.json)`);
        L.push('');
      }
      const softCount = r.findings.filter((f) => f.severity === 'soft' && f.type !== 'page-error').length;
      if (softCount) L.push(`_Soft findings on this route: ${softCount} distinct (see findings.json)._`, '');
    }

    const soft = routes.filter((r) => r.hardOccurrences === 0 && r.softOccurrences > 0);
    if (soft.length) {
      L.push('## Routes with only soft findings', '', '| Persona | Route | Soft | Types |', '| --- | --- | ---: | --- |');
      for (const r of soft.slice(0, 60)) {
        const types = [...new Set(r.findings.filter((f) => f.severity === 'soft' && f.type !== 'page-error').map((f) => f.type))].join(', ');
        L.push(`| ${r.persona} | \`${r.route}\` | ${r.softOccurrences} | ${types} |`);
      }
      if (soft.length > 60) L.push(`| ... | ${soft.length - 60} more in findings.json | | |`);
      L.push('');
    }

    if (this.blocked.size) {
      L.push('## Requests aborted by the read-only guard', '', 'Informational: mutations the pages tried to send while being measured (count = route x device).', '');
      for (const [key, n] of [...this.blocked.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) L.push('- '+'`' + key + '` - ' + n);
      L.push('');
    }

    const skips = this.groupSkips(skipped);
    if (skips.length) {
      L.push('## Skipped routes', '');
      const byReason = new Map<string, string[]>();
      for (const s of skips) byReason.set(s.reason, [...(byReason.get(s.reason) ?? []), `${s.persona} \`${s.route}\``]);
      for (const [reason, list] of byReason) {
        L.push(`- **${reason}** - ${list.length} route(s): ${list.slice(0, 40).join(', ')}${list.length > 40 ? ', ...' : ''}`);
      }
      L.push('');
    }
    return L.join('\n');
  }
}
