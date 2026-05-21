const FAVORITES_KEY = "autoexport_favorites";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function toggleFavorite(encarId: string): boolean {
  const favs = getFavorites();
  const idx = favs.indexOf(encarId);

  if (idx === -1) {
    favs.push(encarId);
  } else {
    favs.splice(idx, 1);
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return idx === -1;
}

export function isFavorite(encarId: string): boolean {
  return getFavorites().includes(encarId);
}
