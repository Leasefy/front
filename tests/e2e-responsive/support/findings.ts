export type FindingType =
  | 'horizontal-overflow'
  | 'occluded-clickable'
  | 'nav-unreachable'
  | 'nav-not-closable'
  | 'nav-missing'
  | 'overlay-cut-off'
  | 'overlay-close-unreachable'
  | 'clipped-text'
  | 'tap-target'
  | 'fixed-overlap'
  | 'content-under-fixed'
  | 'page-error'
  | 'redirected'
  | 'blocked-mutation'
  | 'note'
  | 'suite-error';

export type Severity = 'hard' | 'soft' | 'info';

export interface Finding {
  type: FindingType;
  severity: Severity;
  /** Offending element (compact selector), when there is one. */
  selector?: string;
  /** Human readable explanation with the numbers behind it. */
  detail: string;
  /** Extra structured data (sizes, counts). */
  data?: Record<string, unknown>;
}

/** What a test attaches to its result (`findings.json` attachment) for the reporter. */
export interface TestFindings {
  persona: string;
  route: string;
  /** Concrete URL path that was opened (after id resolution). */
  openedPath: string;
  device: string;
  group: 'mobile' | 'desktop';
  screenshot?: string;
  findings: Finding[];
  skippedReason?: string;
}

export const FINDINGS_ATTACHMENT = 'responsive-findings';

export const HARD_TYPES: ReadonlySet<FindingType> = new Set([
  'horizontal-overflow',
  'occluded-clickable',
  'nav-unreachable',
  'nav-not-closable',
  'nav-missing',
  'overlay-cut-off',
  'overlay-close-unreachable',
]);
