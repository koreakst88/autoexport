"use client";

import Link from "next/link";
import { CarFront, Home, Search, Star } from "lucide-react";

type NavKey = "home" | "catalog" | "favorites" | "quiz";

const NAV_ITEMS: {
  key: NavKey;
  label: string;
  icon: typeof Home;
  href?: string;
}[] = [
  { key: "home", label: "Главная", icon: Home, href: "/" },
  { key: "catalog", label: "Каталог", icon: CarFront, href: "/catalog" },
  { key: "favorites", label: "Избранное", icon: Star, href: "/favorites" },
  { key: "quiz", label: "Подобрать", icon: Search, href: "/quiz" },
];

export function BottomNav({ active }: { active: NavKey }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white">
      <div className="mx-auto grid max-w-2xl grid-cols-4 px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === active;
          const content = (
            <>
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </>
          );

          if (item.href) {
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium ${
                  isActive ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.key}
              type="button"
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium ${
                isActive ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
