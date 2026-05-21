"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/shared/BottomNav";
import type { CatalogCar } from "@/components/catalog/CatalogClient";
import { getFavorites } from "@/lib/favorites";
import { createClient } from "@/lib/supabase/client";
import { useTelegram } from "@/hooks/useTelegram";

export default function FavoritesPage() {
  const router = useRouter();
  const { isInTelegram, showBackButton, hideBackButton } = useTelegram();
  const [cars, setCars] = useState<CatalogCar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const ids = getFavorites();
      if (!ids.length) {
        setCars([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase.from("cars").select("*").in("encar_id", ids);
      setCars((data ?? []) as CatalogCar[]);
      setLoading(false);
    };

    load();

    const onStorage = (event: StorageEvent) => {
      if (event.key === "autoexport_favorites") load();
    };
    window.addEventListener("storage", onStorage);

    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!isInTelegram) return;
    showBackButton(() => {
      if (window.history.length > 1) router.back();
      else router.push("/");
    });
    return () => hideBackButton();
  }, [hideBackButton, isInTelegram, router, showBackButton]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="border-b border-gray-100 bg-white px-4 py-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push("/");
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700"
          aria-label="Назад"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Избранное</h1>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-gray-400">
          Загрузка...
        </div>
      ) : cars.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <span className="text-5xl">⭐</span>
          <p className="text-sm text-gray-500">Нет избранных авто</p>
          <Link href="/catalog" className="text-sm font-medium text-blue-500">
            Перейти в каталог →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {cars.map((car) => (
            <Link key={car.encar_id} href={`/car/${car.encar_id}`}>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="aspect-[4/3] bg-gray-100">
                  {car.photos?.[0] ? (
                    <img
                      src={car.photos[0]}
                      alt={`${car.brand ?? ""} ${car.model ?? ""}`}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold text-gray-900">
                    {car.brand} {car.model} {car.year}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(car.mileage ?? 0).toLocaleString("ru-RU")} км
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <BottomNav active="favorites" />
    </div>
  );
}
