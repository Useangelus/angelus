import "server-only";
import { getBoard } from "./live";
import { errOf, sessionsOf } from "./record";
import { dayLabel, prevTradingDay } from "./clock";

// One "edition" per trading session: the night before that session's opening bell.

export interface EditionRow { ticker: string; close: number; bell: number | null; gap: number | null; open: number | null; miss: number | null }
export interface Edition {
  no: number;
  session: string;
  night: string;
  live: boolean;
  rows: EditionRow[];
  loudest: EditionRow | null;
  /** The morning before this edition, scored. */
  last: { session: string; bell: number; raw: number } | null;
  /** This edition's own morning, once the bell has rung. */
  result: { bell: number; raw: number } | null;
}

const mean = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export async function getEdition(session?: string): Promise<Edition | null> {
  const b = await getBoard();
  const target = session ?? b.clock.session;
  const days = sessionsOf(b.record.rows);
  const all = [...new Set([...days, b.clock.session])].sort();
  const idx = all.indexOf(target);
  if (idx < 0) return null;

  const scored = b.record.rows.filter((r) => r.session === target);
  const live = target === b.clock.session && !scored.length;
  const rows: EditionRow[] = live
    ? b.rows.map((r) => ({ ticker: r.ticker, close: r.close, bell: r.est.bell, gap: r.est.bell != null ? r.est.bell / r.close - 1 : null, open: r.open, miss: r.open && r.est.bell ? Math.abs(r.est.bell / r.open - 1) * 1e4 : null }))
    : scored.map((r) => ({ ticker: r.ticker, close: r.close, bell: r.est.bell, gap: r.est.bell != null ? r.est.bell / r.close - 1 : null, open: r.open, miss: errOf(r, "bell") }));
  if (!rows.length) return null;

  const loudest = rows.slice().sort((a, c) => Math.abs(c.gap ?? 0) - Math.abs(a.gap ?? 0))[0] ?? null;
  const prev = days.filter((d) => d < target).at(-1);
  const prevRows = prev ? b.record.rows.filter((r) => r.session === prev) : [];
  const lb = mean(prevRows.map((r) => errOf(r, "bell"))), lr = mean(prevRows.map((r) => errOf(r, "raw")));
  const rb = scored.length ? mean(scored.map((r) => errOf(r, "bell"))) : null;
  const rr = scored.length ? mean(scored.map((r) => errOf(r, "raw"))) : null;

  return {
    no: idx + 1,
    session: target,
    night: prevTradingDay(target),
    live,
    rows,
    loudest,
    last: prev && lb != null && lr != null ? { session: prev, bell: lb, raw: lr } : null,
    result: rb != null && rr != null ? { bell: rb, raw: rr } : null,
  };
}

export function editionCaption(e: Edition, site: string): string {
  const l = e.loudest;
  const loud = l && l.gap != null ? `Loudest bell: ${l.ticker} ${l.gap > 0 ? "+" : ""}${(l.gap * 100).toFixed(2)}% against the close.` : "";
  const tail = e.result
    ? `The bell rang: the Bell missed the open by ${e.result.bell.toFixed(0)} bp on average, the raw chain price by ${e.result.raw.toFixed(0)} bp.`
    : e.last
      ? `Opening bell ${dayLabel(e.session)}, 09:30 ET. Last morning the Bell missed the open by ${e.last.bell.toFixed(0)} bp, the raw chain price by ${e.last.raw.toFixed(0)} bp.`
      : `Opening bell ${dayLabel(e.session)}, 09:30 ET.`;
  return [`ANGELUS, edition No. ${e.no}. The night of ${dayLabel(e.night)} in ${e.rows.length} bells.`, loud, tail, `${site}/edition/${e.session}`].filter(Boolean).join("\n\n");
}
