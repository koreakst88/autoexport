"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/shared/BottomNav";
import type { CatalogCar } from "@/components/catalog/CatalogClient";
import { getFavorites } from "@/lib/favorites";
import { createClient } from "@/lib/supabase/client";

export default function FavoritesPage() {
  const [cars, setCars] = useState<CatalogCar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getFavorites();

    if (!ids.length) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase
      .from("cars")
      .select("*")
      .in("encar_id", ids)
      .then(({ data }) => {
        setCars((data ?? []) as CatalogCar[]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="border-b border-gray-100 bg-white px-4 py-4">
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
