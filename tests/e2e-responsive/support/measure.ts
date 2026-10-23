/**
 * In-page measurement. Every function here is serialised by Playwright and executed in the
 * browser, so each one MUST be self-contained (no references to module scope).
 */

export interface Offender {
  selector: string;
  left: number;
  right: number;
  width: number;
  overflowBy: number;
}

export interface OccludedItem {
  selector: string;
  coveredBy: string;
  size: string;
  scrollY: number;
}

export interface TapItem {
  selector: string;
  width: number;
  height: number;
}

export interface ClippedItem {
  selector: string;
  axis: 'x' | 'y';
  text: string;
  scroll: number;
  client: number;
  /** The full text is available some other way (title / aria-label). */
  titled: boolean;
}

export interface FixedPair {
  a: string;
  b: string;
  overlapPx: string;
  at: 'top' | 'bottom';
}

export interface CoverItem {
  where: 'top' | 'bottom';
  bar: string;
  coveredPx: number;
  sample: string;
}

export interface SweepResult {
  viewport: { w: number; h: number };
  docScrollWidth: number;
  docClientWidth: number;
  scrollbar: boolean;
  scroller: string;
  maxScroll: number;
  overlayOpenOnLoad: boolean;
  /** Selector of a modal / dialog that is open on load and makes the page behind it inert; '' when none. */
  blockingModal: string;
  overflow: Offender[];
  overflowTotal: number;
  occluded: OccludedItem[];
  occludedTotal: number;
  interactiveSeen: number;
  tap: TapItem[];
  tapTotal: number;
  clipped: ClippedItem[];
  clippedTotal: number;
  fixedOverlap: FixedPair[];
  covered: CoverItem[];
}

export interface SweepOptions {
  tapTargets: boolean;
  maxPositions: number;
}

/** Full-page geometry sweep: overflow, clipped text, occlusion, tap targets, fixed overlap. */
export async function pageSweep(opts: SweepOptions): Promise<SweepResult> {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const vh = window.innerHeight;
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const visible = (el: Element): boolean => {
    const anyEl = el as unknown as {
      checkVisibility?: (o: { checkOpacity: boolean; checkVisibilityCSS: boolean }) => boolean;
    };
    if (typeof anyEl.checkVisibility === 'function') {
      if (!anyEl.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    } else {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  /**
   * True when the element sits inside an ancestor that hides it for good: aria-hidden / inert,
   * or an `overflow: hidden|clip` box with no area (a collapsed accordion group) or that does
   * not intersect the element at all. Deliberately conservative: a partly clipped element
   * (a truncated breadcrumb) is NOT "clipped away", so real occlusion keeps being measured.
   */
  const clippedAway = (e: Element): boolean => {
    const r = e.getBoundingClientRect();
    for (let n = e.parentElement; n && n !== document.body && n !== de; n = n.parentElement) {
      if (n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('inert')) return true;
      const cs = getComputedStyle(n);
      if (!/(hidden|clip)/.test(cs.overflowX + ' ' + cs.overflowY)) continue;
      const nr = n.getBoundingClientRect();
      if (nr.height < 2 || nr.width < 2) return true;
      if (r.bottom <= nr.top + 1 || r.top >= nr.bottom - 1 || r.right <= nr.left + 1 || r.left >= nr.right - 1) return true;
    }
    return false;
  };

  const part = (e: Element): string => {
    const t = e.tagName.toLowerCase();
    const tid = e.getAttribute('data-testid');
    if (tid) return `${t}[data-testid=${tid}]`;
    if (e.id && !/[:]|\d{3,}|radix/.test(e.id)) return `${t}#${e.id}`;
    const cls = (e.getAttribute('class') ?? '')
      .split(/\s+/)
      .filter((c) => c && !/[[\]:/()!]/.test(c))
      .slice(0, 2);
    return t + (cls.length ? '.' + cls.join('.') : '');
  };
  const sel = (e: Element): string => {
    const own = part(e);
    const p = e.parentElement && e.parentElement !== document.body ? part(e.parentElement) + ' > ' : '';
    const label =
      e.getAttribute('aria-label') ||
      ((e as HTMLElement).innerText || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
    return `${p}${own}${label ? ` "${label}"` : ''}`.slice(0, 160);
  };

  // A modal layer (Radix Dialog, alertdialog, aria-modal) is not part of the page layout: it sits
  // over it on purpose and makes everything behind it inert. It is never a "fixed bar" nor an occluder.
  const MODAL = '[role=dialog],[role=alertdialog],[aria-modal=true]';
  const inModal = (e: Element): boolean => !!e.closest(MODAL);

  const inPortal = (e: Element): boolean => e.tagName === 'NEXTJS-PORTAL';
  const all = Array.from(document.body.querySelectorAll('*')).filter(
    (e) => e.tagName.toLowerCase() === 'svg' || !e.closest('svg'),
  );

  // ---- scroll container -------------------------------------------------------------------
  const docScrolls = de.scrollHeight > de.clientHeight + 4;
  let scroller: HTMLElement | null = null;
  if (!docScrolls) {
    let best = 0;
    for (const e of [document.body, ...all] as HTMLElement[]) {
      const cs = getComputedStyle(e);
      if (!/(auto|scroll)/.test(cs.overflowY)) continue;
      if (e.scrollHeight <= e.clientHeight + 4) continue;
      const area = e.clientWidth * e.clientHeight;
      if (area > best && area >= 0.4 * vw * vh) {
        best = area;
        scroller = e;
      }
    }
  }
  const maxScroll = scroller
    ? scroller.scrollHeight - scroller.clientHeight
    : Math.max(0, de.scrollHeight - vh);
  const scrollTo = (y: number) => {
    if (scroller) scroller.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    else window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
  };

  // ---- horizontal overflow ----------------------------------------------------------------
  const scrollbar = de.scrollWidth > de.clientWidth + 1;
  const isPositionedOut = (e: Element): boolean => {
    for (let n: Element | null = e; n && n !== document.body; n = n.parentElement) {
      const p = getComputedStyle(n).position;
      if (p === 'fixed' || p === 'absolute') return true;
    }
    return false;
  };
  const contained = (e: Element): boolean => {
    for (let n = e.parentElement; n && n !== document.body && n !== de; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (/(hidden|clip|auto|scroll)/.test(cs.overflowX)) {
        const r = n.getBoundingClientRect();
        if (r.right <= vw + 1 && r.left >= -1) return true;
      }
    }
    return false;
  };
  const decorative = (e: Element): boolean => {
    const text = ((e as HTMLElement).innerText ?? '').trim();
    if (text) return false;
    if (e.closest('[aria-hidden="true"]')) return true;
    return getComputedStyle(e).pointerEvents === 'none';
  };

  const offenderSet = new Set<Element>();
  const offenderInfo = new Map<Element, Offender>();
  for (const e of all) {
    if (inPortal(e) || !visible(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.right <= vw + 1 && r.left >= -1) continue;
    const entirelyOut = r.left >= vw - 1 || r.right <= 1;
    if (entirelyOut && isPositionedOut(e)) continue; // closed drawers, off-canvas panels
    if (decorative(e)) continue;
    if (contained(e)) continue;
    offenderSet.add(e);
    offenderInfo.set(e, {
      selector: sel(e),
      left: Math.round(r.left),
      right: Math.round(r.right),
      width: Math.round(r.width),
      overflowBy: Math.round(Math.max(r.right - vw, -r.left)),
    });
  }
  const topmost = [...offenderSet].filter((e) => !e.parentElement || !offenderSet.has(e.parentElement));
  const overflow = topmost
    .map((e) => offenderInfo.get(e) as Offender)
    .sort((a, b) => b.overflowBy - a.overflowBy);

  // ---- clipped text (soft) ----------------------------------------------------------------
  const hasOwnText = (e: Element): boolean =>
    Array.from(e.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 1);
  const clipped: ClippedItem[] = [];
  // Visually hidden by design (skip links, screen-reader-only announcements): not a layout bug.
  const HIDDEN_BY_DESIGN = '.sr-only,.skip-link,[class*="skip-link"],[class*="visually-hidden"],[class*="sr-only"]';
  for (const e of all as HTMLElement[]) {
    if (!hasOwnText(e) || !visible(e)) continue;
    if (e.matches(HIDDEN_BY_DESIGN) || e.closest(HIDDEN_BY_DESIGN)) continue;
    const box = e.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) continue; // 1px accessibility elements
    if (clippedAway(e)) continue;
    const cs = getComputedStyle(e);
    if (cs.display === 'inline') continue;
    const lineClamp = cs.getPropertyValue('-webkit-line-clamp');
    if (lineClamp && lineClamp !== 'none') continue;
    const hidesX = /(hidden|clip)/.test(cs.overflowX);
    const hidesY = /(hidden|clip)/.test(cs.overflowY);
    const titled = !!(e.getAttribute('title') || e.getAttribute('aria-label') || e.closest('[title]'));
    if (hidesX && cs.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 2) {
      clipped.push({
        selector: sel(e),
        axis: 'x',
        text: (e.textContent ?? '').trim().slice(0, 40),
        scroll: e.scrollWidth,
        client: e.clientWidth,
        titled,
      });
    } else if (hidesY && e.scrollHeight > e.clientHeight + 2 && e.clientHeight > 0) {
      clipped.push({
        selector: sel(e),
        axis: 'y',
        text: (e.textContent ?? '').trim().slice(0, 40),
        scroll: e.scrollHeight,
        client: e.clientHeight,
        titled,
      });
    }
  }

  // ---- interactive elements ---------------------------------------------------------------
  const INTERACTIVE =
    'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=option],[role=combobox]';
  const interactive = (Array.from(document.body.querySelectorAll(INTERACTIVE)) as HTMLElement[]).filter(
    (e) => {
      if ((e as HTMLButtonElement).disabled || e.getAttribute('aria-disabled') === 'true') return false;
      if (e.closest('[aria-hidden="true"],[inert]')) return false;
      if (getComputedStyle(e).pointerEvents === 'none') return false;
      const r = e.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) return false; // sr-only / skip links
      if (clippedAway(e)) return false; // collapsed accordion groups, off-canvas carousel items
      return visible(e);
    },
  );

  // Overlay already open on load (cookie banner, tour, modal): everything behind it is
  // expected to be covered, so occlusion is only judged for elements inside it.
  const overlayEl = Array.from(document.querySelectorAll(MODAL)).find((e) => visible(e));
  const overlayOpenOnLoad = !!overlayEl;
  const blockingModal = overlayEl ? sel(overlayEl) : '';

  // ---- tap targets (soft) -----------------------------------------------------------------
  // The drawn box is not the tap area: the app grows touch targets with a `::after` pseudo-element
  // (`.hit-area-44`), which `getBoundingClientRect` never sees but `elementFromPoint` does (it
  // returns the owning element). So a target below 44px is hit-tested at the ends of a 44px box
  // centred on it, and passes when both ends still land on it. Targets under 24px also pass the
  // WCAG 2.5.8 spacing exception: a 24px circle centred on them touches no other target (nor the
  // circle of another undersized one). Inline links inside text are exempt.
  const tap: TapItem[] = [];
  let tapTotal = 0;
  if (opts.tapTargets) {
    const tapTargets = interactive.filter((e) => {
      if (e.tagName === 'INPUT') {
        const t = (e as HTMLInputElement).type;
        if ((t === 'checkbox' || t === 'radio') && e.closest('label')) return false; // label is the hit area
      }
      if (e.tagName === 'A' && getComputedStyle(e).display === 'inline') return false; // inline text links are exempt
      return !e.parentElement?.closest(INTERACTIVE); // nested: the parent is the target
    });
    const boxes = new Map<HTMLElement, DOMRect>(tapTargets.map((e) => [e, e.getBoundingClientRect()]));
    const landsOn = (e: HTMLElement, x: number, y: number): boolean => {
      if (x < 0 || y < 0 || x >= vw || y >= vh) return true; // off screen: cannot be judged, benefit of the doubt
      const hit = document.elementFromPoint(x, y);
      return !!hit && (hit === e || e.contains(hit));
    };
    const circleTouches = (c: DOMRect, o: DOMRect): boolean => {
      const cx = c.left + c.width / 2;
      const cy = c.top + c.height / 2;
      const dx = Math.max(o.left - cx, 0, cx - o.right);
      const dy = Math.max(o.top - cy, 0, cy - o.bottom);
      return Math.hypot(dx, dy) < 12;
    };
    for (const e of tapTargets) {
      const drawn = boxes.get(e) as DOMRect;
      if (drawn.width >= 44 && drawn.height >= 44) continue;

      // Hit-test the 44px box. Bring the element on screen first, then put every scroller back.
      const moved: Array<[HTMLElement, number, number]> = [];
      for (let n: HTMLElement | null = e.parentElement; n; n = n.parentElement) {
        if (n.scrollHeight > n.clientHeight || n.scrollWidth > n.clientWidth) moved.push([n, n.scrollTop, n.scrollLeft]);
      }
      e.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as ScrollBehavior });
      const r = e.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const effW = r.width >= 44 || (landsOn(e, cx - 21, cy) && landsOn(e, cx + 21, cy)) ? Math.max(r.width, 44) : r.width;
      const effH = r.height >= 44 || (landsOn(e, cx, cy - 21) && landsOn(e, cx, cy + 21)) ? Math.max(r.height, 44) : r.height;
      for (const [n, top, left] of moved) {
        n.scrollTop = top;
        n.scrollLeft = left;
      }
      scrollTo(0);
      if (effW >= 44 && effH >= 44) continue;

      if (effW < 24 && effH < 24) {
        let crowded = false;
        for (const [o, ob] of boxes) {
          if (o === e) continue;
          const small = ob.width < 24 && ob.height < 24;
          const apart = small
            ? Math.hypot(ob.left + ob.width / 2 - (drawn.left + drawn.width / 2), ob.top + ob.height / 2 - (drawn.top + drawn.height / 2)) >= 24
            : !circleTouches(drawn, ob);
          if (!apart) {
            crowded = true;
            break;
          }
        }
        if (!crowded) continue;
      }
      tapTotal++;
      if (tap.length < 40) tap.push({ selector: sel(e), width: Math.round(drawn.width), height: Math.round(drawn.height) });
    }
  }

  // ---- fixed / sticky inventory -----------------------------------------------------------
  const fixedTop = (): HTMLElement[] => {
    const list = (all as HTMLElement[]).filter((e) => {
      if (inPortal(e)) return false;
      if (inModal(e) || e.querySelector(MODAL)) return false; // modal layers are reported on their own
      if (['TH', 'TD', 'THEAD', 'TR'].includes(e.tagName)) return false;
      const cs = getComputedStyle(e);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') return false;
      if (cs.pointerEvents === 'none') return false;
      if (!visible(e)) return false;
      const r = e.getBoundingClientRect();
      if (r.width * r.height < 400) return false;
      if (r.width >= vw * 0.95 && r.height >= vh * 0.9) return false; // backdrops / full screen
      return r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
    });
    return list.filter((e) => !list.some((o) => o !== e && o.contains(e)));
  };

  const fixedOverlap: FixedPair[] = [];
  const covered: CoverItem[] = [];
  const leaves = (): HTMLElement[] =>
    (all as HTMLElement[]).filter((e) => {
      if (inPortal(e) || decorative(e) || inModal(e)) return false;
      const t = e.tagName;
      const leaf =
        hasOwnText(e) || t === 'IMG' || t === 'INPUT' || t === 'BUTTON' || t === 'SELECT' || t === 'TEXTAREA';
      return leaf && visible(e);
    });

  const inspectFixed = (at: 'top' | 'bottom') => {
    const fx = fixedTop();
    for (let i = 0; i < fx.length; i++) {
      for (let j = i + 1; j < fx.length; j++) {
        const a = fx[i].getBoundingClientRect();
        const b = fx[j].getBoundingClientRect();
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 4 && h > 4) {
          fixedOverlap.push({
            a: sel(fx[i]),
            b: sel(fx[j]),
            overlapPx: `${Math.round(w)}x${Math.round(h)}`,
            at,
          });
        }
      }
    }
    const lv = leaves().filter(
      (e) => !fx.some((f) => f.contains(e)) && getComputedStyle(e).position !== 'fixed',
    );
    if (at === 'bottom') {
      const bars = fx.filter((f) => {
        const r = f.getBoundingClientRect();
        return r.top > vh * 0.4 && r.bottom >= vh - 3 && r.width >= vw * 0.5;
      });
      for (const bar of bars) {
        const top = bar.getBoundingClientRect().top;
        const hidden = lv.filter((e) => {
          const r = e.getBoundingClientRect();
          return r.bottom > top + 2 && r.top < vh && r.bottom <= vh + 1;
        });
        if (hidden.length) {
          const worst = Math.max(...hidden.map((e) => e.getBoundingClientRect().bottom - top));
          covered.push({ where: 'bottom', bar: sel(bar), coveredPx: Math.round(worst), sample: sel(hidden[0]) });
        }
      }
    } else {
      const bars = fx.filter((f) => {
        const r = f.getBoundingClientRect();
        return r.top <= 3 && r.bottom < vh * 0.5 && r.width >= vw * 0.5;
      });
      for (const bar of bars) {
        const bottom = bar.getBoundingClientRect().bottom;
        const hidden = lv.filter((e) => {
          const r = e.getBoundingClientRect();
          return r.top < bottom - 2 && r.bottom > 0 && r.top >= -1;
        });
        if (hidden.length) {
          const worst = Math.max(...hidden.map((e) => bottom - e.getBoundingClientRect().top));
          covered.push({ where: 'top', bar: sel(bar), coveredPx: Math.round(worst), sample: sel(hidden[0]) });
        }
      }
    }
  };

  // ---- scroll sweep: occlusion ------------------------------------------------------------
  type Rec = { el: HTMLElement; seen: number; ok: number; by: string; y: number };
  const rec = new Map<HTMLElement, Rec>();
  const hitOk = (el: HTMLElement, hit: Element | null): boolean => {
    if (!hit) return true;
    if (inPortal(hit)) return true; // Next dev indicator
    const hitModal = hit.closest(MODAL);
    if (hitModal && !hitModal.contains(el)) return true; // behind a modal: inert on purpose, not occluded
    if (hit === el || el.contains(hit) || hit.contains(el)) return true;
    // A sibling inside the same interactive ancestor (a span in the same <a>/<button>) is not an occluder.
    const parentInteractive = el.parentElement?.closest(INTERACTIVE);
    if (parentInteractive && parentInteractive.contains(hit)) return true;
    const label = el.closest('label');
    if (label && label.contains(hit)) return true;
    const hl = hit.closest('label') as HTMLLabelElement | null;
    return !!hl && hl.control === el;
  };
  /**
   * Nearest ancestor that scrolls on its own (a sidebar nav with `overflow-y: auto`), other than
   * the page scroller handled by `scrollTo`. Elements inside one are only reachable by scrolling
   * it, so the sweep must scroll it too: otherwise the last nav items sit below the nav's visible
   * area, where the sticky footer ("Ayuda") rightly covers their geometry (a false positive).
   */
  const innerScroller = (e: Element): HTMLElement | null => {
    for (let n = e.parentElement; n && n !== document.body && n !== de; n = n.parentElement) {
      if (n === scroller) return null;
      const cs = getComputedStyle(n);
      if (/(auto|scroll|overlay)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1) return n;
    }
    return null;
  };
  const probeOne = (y: number, el: HTMLElement, nested: boolean): void => {
    if (overlayEl && !overlayEl.contains(el)) return;
    if (nested) {
      // Centre it inside every scrollable ancestor, then hit-test where the user would see it.
      // A fixed element that still covers it after this is a true positive and is reported.
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' as ScrollBehavior });
    }
    const r = el.getBoundingClientRect();
    const x0 = Math.max(r.left, 0);
    const x1 = Math.min(r.right, vw);
    const y0 = Math.max(r.top, 0);
    const y1 = Math.min(r.bottom, vh);
    if (x1 - x0 <= 1 || y1 - y0 <= 1) return;
    const vis = ((x1 - x0) * (y1 - y0)) / (r.width * r.height);
    if (vis < 0.6) return; // mostly off-screen at this scroll position
    const hit = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2);
    const cur = rec.get(el) ?? { el, seen: 0, ok: 0, by: '', y };
    cur.seen++;
    if (hitOk(el, hit)) cur.ok++;
    else {
      cur.by = hit ? sel(hit) : 'unknown';
      cur.y = y;
    }
    rec.set(el, cur);
  };
  const probe = (y: number) => {
    for (const el of interactive) {
      const nested = !!innerScroller(el);
      probeOne(y, el, nested);
      // scrollIntoView also moves the page scroller: put it back before the next element's rect is read.
      if (nested) scrollTo(y);
    }
  };

  scrollTo(0);
  await sleep(120);
  inspectFixed('top');
  const step = Math.max(120, Math.floor(vh * 0.55));
  const positions: number[] = [];
  for (let y = 0; y < maxScroll && positions.length < opts.maxPositions - 1; y += step) positions.push(y);
  positions.push(maxScroll);
  for (const y of positions) {
    scrollTo(y);
    await sleep(110);
    probe(y);
  }
  // Bottom of the page: what the user sees last.
  scrollTo(maxScroll);
  await sleep(120);
  inspectFixed('bottom');
  scrollTo(0);

  const occludedAll = [...rec.values()].filter((r) => r.seen > 0 && r.ok === 0);
  const occluded: OccludedItem[] = occludedAll.slice(0, 40).map((r) => {
    const b = r.el.getBoundingClientRect();
    return {
      selector: sel(r.el),
      coveredBy: r.by,
      size: `${Math.round(b.width)}x${Math.round(b.height)}`,
      scrollY: Math.round(r.y),
    };
  });

  const seenKeys = new Set<string>();
  const overlapUnique = fixedOverlap.filter((p) => {
    const k = p.a + '|' + p.b + '|' + p.at;
    if (seenKeys.has(k)) return false;
    seenKeys.add(k);
    return true;
  });
  const seenCover = new Set<string>();
  const coverUnique = covered.filter((c) => {
    const k = c.where + c.bar;
    if (seenCover.has(k)) return false;
    seenCover.add(k);
    return true;
  });

  return {
    viewport: { w: vw, h: vh },
    docScrollWidth: de.scrollWidth,
    docClientWidth: de.clientWidth,
    scrollbar,
    scroller: scroller ? sel(scroller) : 'document',
    maxScroll: Math.round(maxScroll),
    overlayOpenOnLoad,
    blockingModal,
    overflow: overflow.slice(0, 12),
    overflowTotal: overflow.length,
    occluded,
    occludedTotal: occludedAll.length,
    interactiveSeen: rec.size,
    tap: tap.slice(0, 40),
    tapTotal,
    clipped: clipped.slice(0, 15),
    clippedTotal: clipped.length,
    fixedOverlap: overlapUnique.slice(0, 10),
    covered: coverUnique.slice(0, 10),
  };
}

/** Quick horizontal-overflow-only probe, used after switching tabs. */
export function overflowProbe(): { scrollbar: boolean; scrollWidth: number; clientWidth: number } {
  const de = document.documentElement;
  return {
    scrollbar: de.scrollWidth > de.clientWidth + 1,
    scrollWidth: de.scrollWidth,
    clientWidth: de.clientWidth,
  };
}

export interface PageErrorProbe {
  isError: boolean;
  reason: string;
}

/** Error-page detection: an error screen is a finding of its own, not a layout bug. */
export function errorProbe(): PageErrorProbe {
  const text = (document.body?.innerText ?? '').slice(0, 4000);
  const checks: Array<[RegExp, string]> = [
    [/No pudimos cargar esto/i, 'app error boundary ("No pudimos cargar esto")'],
    [/Application error: a (client|server)-side exception/i, 'Next.js application error'],
    [/This page could not be found/i, 'Next.js 404'],
    [/Internal Server Error/i, '5xx page'],
    [/Unhandled Runtime Error/i, 'Next dev runtime error overlay'],
  ];
  for (const [re, reason] of checks) if (re.test(text)) return { isError: true, reason };
  return { isError: false, reason: '' };
}

/**
 * The access-denied card ("No tienes acceso a ...", PageGuard / AgentModuleGate): the persona's
 * role does not include the screen, so there is no real layout to measure. Matched on a short
 * visible block that STARTS with the phrase, so a sentence elsewhere on a normal page does not
 * count.
 */
export function forbiddenProbe(): { forbidden: boolean; text: string } {
  const nodes = Array.from(
    document.querySelectorAll('h1,h2,h3,h4,[role=heading],[role=alert],[role=status],main p,main div'),
  );
  for (const n of nodes) {
    const own = Array.from(n.childNodes)
      .filter((c) => c.nodeType === 3)
      .map((c) => c.textContent ?? '')
      .join(' ')
      .trim();
    const full = ((n as HTMLElement).innerText ?? '').trim();
    let text = '';
    if (/^No tienes acceso\b/i.test(own)) text = own;
    else if (/^No tienes acceso\b/i.test(full) && full.length < 160) text = full;
    if (!text) continue;
    const r = n.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { forbidden: true, text: text.replace(/\s+/g, ' ').slice(0, 100) };
  }
  return { forbidden: false, text: '' };
}

export interface OverlayReport {
  found: boolean;
  kind: string;
  selector: string;
  rect: { left: number; top: number; right: number; bottom: number } | null;
  viewport: { w: number; h: number };
  insideViewport: boolean;
  scrollable: boolean;
  closeFound: boolean;
  closeReachable: boolean;
  closeSelector: string;
}

/** Measures the topmost open dialog / sheet / menu. */
export function overlayProbe(): OverlayReport {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const vis = (e: Element) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  };
  const cands = Array.from(document.querySelectorAll('[role=dialog],[role=alertdialog],[role=menu]')).filter(
    (e) => vis(e) && !e.closest('[aria-hidden="true"]'),
  );
  const empty: OverlayReport = {
    found: false,
    kind: '',
    selector: '',
    rect: null,
    viewport: { w: vw, h: vh },
    insideViewport: true,
    scrollable: false,
    closeFound: false,
    closeReachable: false,
    closeSelector: '',
  };
  if (!cands.length) return empty;
  const el = cands[cands.length - 1] as HTMLElement;
  const r = el.getBoundingClientRect();
  const insideViewport = r.left >= -1 && r.top >= -1 && r.right <= vw + 1 && r.bottom <= vh + 1;
  let scrollable = el.scrollHeight > el.clientHeight + 2;
  if (!scrollable) {
    scrollable = Array.from(el.querySelectorAll('*')).some((c) => {
      const cs = getComputedStyle(c);
      return /(auto|scroll)/.test(cs.overflowY) && c.scrollHeight > c.clientHeight + 2;
    });
  }
  const closeBtn = Array.from(el.querySelectorAll('button,[role=button],a')).find((b) => {
    const label = (b.getAttribute('aria-label') ?? '') + ' ' + ((b as HTMLElement).innerText ?? '');
    return /(cerrar|close|cancelar|^\s*[x×✕]\s*$)/i.test(label) && vis(b);
  }) as HTMLElement | undefined;
  let closeReachable = false;
  if (closeBtn) {
    const cr = closeBtn.getBoundingClientRect();
    const inView = cr.left >= -1 && cr.right <= vw + 1 && cr.top >= -1 && cr.bottom <= vh + 1;
    const hit = document.elementFromPoint(cr.left + cr.width / 2, cr.top + cr.height / 2);
    closeReachable = inView && !!hit && (closeBtn === hit || closeBtn.contains(hit) || hit.contains(closeBtn));
  }
  const label =
    el.getAttribute('aria-label') || el.getAttribute('data-testid') || (el.textContent ?? '').trim().slice(0, 30);
  return {
    found: true,
    kind: el.getAttribute('role') ?? 'overlay',
    selector: `${el.tagName.toLowerCase()}[role=${el.getAttribute('role')}] "${label}"`.slice(0, 120),
    rect: { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) },
    viewport: { w: vw, h: vh },
    insideViewport,
    scrollable,
    closeFound: !!closeBtn,
    closeReachable,
    closeSelector: closeBtn ? (closeBtn.getAttribute('aria-label') ?? closeBtn.tagName.toLowerCase()) : '',
  };
}

export const NAV_MARK = 'data-rsp-before';

/** Marks every currently visible link/button so a later diff finds what a menu revealed. */
export function markVisibleInteractive(attr: string): number {
  let n = 0;
  for (const e of Array.from(document.querySelectorAll('a[href],button,[role=menuitem],[role=button]'))) {
    e.removeAttribute(attr);
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0') {
      e.setAttribute(attr, '1');
      n++;
    }
  }
  return n;
}

export interface NavItemReport {
  total: number;
  unreachable: Array<{ selector: string; reason: string }>;
}

/** Audits the items a menu/drawer revealed: horizontally inside, reachable by scrolling, not covered. */
export function auditRevealedItems(attr: string): NavItemReport {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const label = (e: Element) =>
    `${e.tagName.toLowerCase()} "${(e.getAttribute('aria-label') || (e as HTMLElement).innerText || e.textContent || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 40)}"`;
  // Items inside a collapsed accordion group (overflow hidden, zero height) or an aria-hidden /
  // inert subtree are not on screen: they are not "unreachable", they are closed.
  const clippedAway = (e: Element): boolean => {
    const r = e.getBoundingClientRect();
    for (let n = e.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('inert')) return true;
      const cs = getComputedStyle(n);
      if (!/(hidden|clip)/.test(cs.overflowX + ' ' + cs.overflowY)) continue;
      const nr = n.getBoundingClientRect();
      if (nr.height < 2 || nr.width < 2) return true;
      if (r.bottom <= nr.top + 1 || r.top >= nr.bottom - 1 || r.right <= nr.left + 1 || r.left >= nr.right - 1) return true;
    }
    return false;
  };
  const items = Array.from(document.querySelectorAll('a[href],button,[role=menuitem]')).filter((e) => {
    if (e.hasAttribute(attr)) return false;
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    if (!(r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0')) {
      return false;
    }
    return !clippedAway(e);
  });
  const unreachable: Array<{ selector: string; reason: string }> = [];
  for (const e of items.slice(0, 120)) {
    (e as HTMLElement).scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' as ScrollBehavior });
    const r = e.getBoundingClientRect();
    const insideH = r.left >= -1 && r.right <= vw + 1;
    const insideV = r.top >= -1 && r.bottom <= vh + 1;
    if (!insideH || !insideV) {
      unreachable.push({
        selector: label(e),
        reason: `outside the viewport after scrolling it into view (l=${Math.round(r.left)} r=${Math.round(r.right)} t=${Math.round(r.top)} b=${Math.round(r.bottom)} in ${vw}x${vh})`,
      });
      continue;
    }
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit && !(hit === e || e.contains(hit) || hit.contains(e)) && hit.tagName !== 'NEXTJS-PORTAL') {
      unreachable.push({ selector: label(e), reason: `covered by ${hit.tagName.toLowerCase()}` });
    }
  }
  return { total: items.length, unreachable };
}

/** How many of the revealed items are still visible (used to confirm the menu closed). */
export function countStillVisible(attr: string): number {
  let n = 0;
  for (const e of Array.from(document.querySelectorAll('a[href],button,[role=menuitem]'))) {
    if (e.hasAttribute(attr)) continue;
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0') {
      // Items off-canvas (translated away) do not count as visible.
      if (r.right > 0 && r.left < document.documentElement.clientWidth && r.bottom > 0 && r.top < window.innerHeight) n++;
    }
  }
  return n;
}
