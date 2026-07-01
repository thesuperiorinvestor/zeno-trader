"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { JournalSection } from "@/components/daily/JournalSection";
import { ProgressSection } from "@/components/daily/ProgressSection";
import { todayISO, addDaysISO } from "@/lib/utils";

export default function DailyPage() {
  const [date, setDate] = useState<string>(todayISO());

  return (
    <div>
      <PageHeader
        title="Daily"
        subtitle="Plan · debrief · accountability"
        actions={
          <>
            <button onClick={() => setDate(addDaysISO(date, -1))} className="btn-secondary p-2" title="Previous day">
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              className="input w-auto"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button
              onClick={() => setDate(addDaysISO(date, 1))}
              className="btn-secondary p-2"
              title="Next day"
              disabled={date >= todayISO()}
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setDate(todayISO())}
              className="btn-secondary text-xs"
              disabled={date === todayISO()}
            >
              Today
            </button>
          </>
        }
      />

      <div className="px-8 pb-12 space-y-8">
        <JournalSection date={date} />
        <ProgressSection date={date} />
      </div>
    </div>
  );
}
