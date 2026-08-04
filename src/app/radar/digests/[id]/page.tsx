import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, ExternalLink, Gauge, Search } from "lucide-react";
import { RadarDigestClient } from "./RadarDigestClient";
import { getRadarDigest, type RadarListingEvent } from "@/server/radar/repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Новые автомобили — AutoExport Radar",
  robots: { index: false, follow: false },
};

const ageLabels: Record<string, string> = {
  under_3: "До 3 лет",
  from_3_to_5: "3–5 лет",
  from_5_to_7: "5–7 лет",
};

const fuelLabels: Record<string, string> = {
  gasoline: "Бензин",
  diesel: "Дизель",
  lpg: "LPG",
  hybrid_gasoline: "Гибрид",
  hybrid_diesel: "Дизельный гибрид",
  electric: "Электро",
  hydrogen: "Водород",
  other: "Другое",
  unknown: "Не указано",
};

type Listing = {
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  ageGroup?: string;
  priceKrw?: number | null;
  mileageKm?: number | null;
  fuelType?: string;
  offerType?: string;
};

function listingOf(event: RadarListingEvent): Listing {
  return event.current_state as Listing;
}

function number(value: number | null | undefined): string {
  return typeof value === "number" ? new Intl.NumberFormat("ru-RU").format(value) : "—";
}

function seoulDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Seoul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(value))
    .replace(",", "");
}

function filterHref(id: string, filter: { age?: string; model?: string } = {}): string {
  const parameters = new URLSearchParams();
  if (filter.age) parameters.set("age", filter.age);
  if (filter.model) parameters.set("model", filter.model);
  const query = parameters.toString();
  return `/radar/digests/${encodeURIComponent(id)}${query ? `?${query}` : ""}`;
}

function titleOf(listing: Listing, fallbackId: string): string {
  return [listing.brand, listing.model, listing.year].filter(Boolean).join(" ") || `Encar ${fallbackId}`;
}

export default async function RadarDigestPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { age?: string; model?: string };
}) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(params.id)) notFound();
  const result = await getRadarDigest(params.id);
  if (!result) notFound();

  const saleEvents = result.events.filter((event) => listingOf(event).offerType === "sale");
  const age = searchParams?.age && ageLabels[searchParams.age] ? searchParams.age : undefined;
  const model = searchParams?.model?.trim() || undefined;
  const selectedEvents = saleEvents.filter((event) => {
    const listing = listingOf(event);
    const modelName = [listing.brand, listing.model].filter(Boolean).join(" ");
    return (!age || listing.ageGroup === age) && (!model || modelName === model);
  });

  const ageCounts = Object.fromEntries(
    Object.keys(ageLabels).map((key) => [
      key,
      saleEvents.filter((event) => listingOf(event).ageGroup === key).length,
    ]),
  );
  const modelCounts = new Map<string, number>();
  for (const event of saleEvents) {
    const listing = listingOf(event);
    const name = [listing.brand, listing.model].filter(Boolean).join(" ") || "Без модели";
    modelCounts.set(name, (modelCounts.get(name) ?? 0) + 1);
  }
  const popularModels = Array.from(modelCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 6);
  const activeLabel = model ?? (age ? ageLabels[age] : "Все автомобили");

  return (
    <RadarDigestClient>
      <main className="min-h-screen bg-slate-50 pb-10 text-slate-950">
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 px-4 pb-4 pt-5 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 text-lg font-bold text-white shadow-sm">
                A
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">AutoExport Radar</p>
                <h1 className="text-xl font-bold">Новые автомобили</h1>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Clock3 className="h-4 w-4" />
              {seoulDateTime(result.digest.window_start)}–{seoulDateTime(result.digest.window_end).slice(11)} KST
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-2xl space-y-5 px-4 py-5">
          <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-sm">
            <p className="text-sm text-slate-300">Найдено за 10 минут</p>
            <p className="mt-1 text-4xl font-bold">{saleEvents.length}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              {Object.entries(ageLabels).map(([key, label]) => (
                <Link
                  key={key}
                  href={filterHref(result.digest.id, { age: key })}
                  className={`rounded-2xl px-2 py-3 transition ${age === key ? "bg-sky-500" : "bg-white/10"}`}
                >
                  <span className="block text-lg font-bold">{ageCounts[key] ?? 0}</span>
                  {label}
                </Link>
              ))}
            </div>
          </section>

          {popularModels.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-bold text-slate-700">Популярные модели</h2>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {popularModels.map(([name, count]) => (
                  <Link
                    key={name}
                    href={filterHref(result.digest.id, { model: name })}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${model === name ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 bg-white"}`}
                  >
                    {name} · {count}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">{activeLabel}</h2>
                <p className="text-sm text-slate-500">{selectedEvents.length} объявлений · сначала свежие</p>
              </div>
              {age || model ? (
                <Link href={filterHref(result.digest.id)} className="text-sm font-semibold text-sky-600">
                  Сбросить
                </Link>
              ) : null}
            </div>

            {selectedEvents.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                <Search className="mx-auto mb-3 h-7 w-7" />
                В этом разделе объявлений нет.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((event) => {
                  const listing = listingOf(event);
                  return (
                    <article key={event.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold leading-snug">{titleOf(listing, event.canonical_encar_id)}</h3>
                          <p className="mt-1 text-xl font-bold text-sky-600">₩{number(listing.priceKrw)}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Новое</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                        <span className="flex items-center gap-1.5"><Gauge className="h-4 w-4" />{number(listing.mileageKm)} км</span>
                        <span>{fuelLabels[listing.fuelType ?? "unknown"] ?? listing.fuelType}</span>
                        <span>{ageLabels[listing.ageGroup ?? ""]}</span>
                      </div>
                      <p className="mt-3 text-xs text-slate-400">Опубликовано {event.published_at ? seoulDateTime(event.published_at) : "—"} KST</p>
                      <a
                        href={`https://fem.encar.com/cars/detail/${encodeURIComponent(event.canonical_encar_id)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-bold text-white"
                      >
                        Открыть на Encar <ExternalLink className="h-4 w-4" />
                      </a>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </RadarDigestClient>
  );
}
