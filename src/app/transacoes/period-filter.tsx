"use client";

import { useState } from "react";

export function PeriodFilter({
  year,
  month,
  day,
  years,
}: {
  year: string;
  month: string;
  day: string;
  years: number[];
}) {
  const [selectedYear, setYear] = useState(year);
  const [selectedMonth, setMonth] = useState(month.slice(5));
  const [selectedDay, setDay] = useState(day);
  const inputClass =
    "min-h-11 min-w-0 rounded-lg border border-[var(--line)] bg-white px-3 font-normal outline-none focus:border-[var(--accent)]";
  return (
    <>
      <label className="grid gap-2 text-sm font-medium" htmlFor="year">
        Ano
        <select
          id="year"
          name="year"
          className={inputClass}
          value={selectedYear}
          onChange={(event) => {
            setYear(event.target.value);
            if (!event.target.value) setMonth("");
            setDay("");
          }}
        >
          <option value="">Todos os anos</option>
          {selectedYear && !years.includes(Number(selectedYear)) ? (
            <option value={selectedYear} disabled>
              {selectedYear} (sem lançamentos)
            </option>
          ) : null}
          {years.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium" htmlFor="month">
        Mês
        <select
          id="month"
          className={inputClass}
          value={selectedMonth}
          disabled={!selectedYear}
          onChange={(event) => {
            setMonth(event.target.value);
            setDay("");
          }}
        >
          <option value="">Todos os meses</option>
          {Array.from({ length: 12 }, (_, index) => {
            const value = String(index + 1).padStart(2, "0");
            return (
              <option key={value} value={value}>
                {new Intl.DateTimeFormat("pt-BR", {
                  month: "long",
                  timeZone: "UTC",
                }).format(new Date(Date.UTC(2026, index, 1)))}
              </option>
            );
          })}
        </select>
        <input
          type="hidden"
          name="month"
          value={
            selectedYear && selectedMonth
              ? `${selectedYear}-${selectedMonth}`
              : ""
          }
        />
      </label>
      <label className="grid gap-2 text-sm font-medium" htmlFor="day">
        Dia
        <input
          id="day"
          name="dia"
          type="date"
          className={inputClass}
          value={selectedDay}
          onChange={(event) => setDay(event.target.value)}
        />
      </label>
    </>
  );
}
