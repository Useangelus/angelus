"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import s from "./hero.module.css";

const Belfry = dynamic(() => import("./Belfry"), { ssr: false, loading: () => <div className={s.loading} /> });

/** One stock's bell, alone in its bay of the tower. */
export default function StockBell({ ticker, gap, children }: { ticker: string; gap: number | null; children: React.ReactNode }) {
  const bells = useMemo(() => [{ ticker, gap }], [ticker, gap]);
  return (
    <section className={s.stockHero} aria-label={`${ticker} bell`}>
      <div className={s.stage}>
        <Belfry bells={bells} selected={null} onSelect={() => {}} focusY={0.36} fill={0.62} showLabels={false} />
        <div className={s.fade} aria-hidden />
      </div>
      <div className={`wrap ${s.stockOver}`}>{children}</div>
    </section>
  );
}
