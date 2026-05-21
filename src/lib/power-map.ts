// Маппинг: бренд + модель + объём (cc) → мощность (л.с.)
// Источник: официальные характеристики корейских производителей

interface PowerEntry {
  power: number
  note?: string
}

type PowerMap = Record<string, PowerEntry>

const POWER_MAP: PowerMap = {
  // Hyundai Tucson
  'hyundai_tucson_1598': { power: 150, note: '1.6 T-GDi' },
  'hyundai_tucson_1999': { power: 186, note: '2.0 MPI' },
  'hyundai_tucson_2199': { power: 186, note: '2.2 CRDi' },

  // Hyundai Santa Fe
  'hyundai_santafe_1598': { power: 180, note: '1.6 T-GDi HEV' },
  'hyundai_santafe_1999': { power: 197, note: '2.0 T-GDi' },
  'hyundai_santafe_2199': { power: 202, note: '2.2 CRDi' },

  // Hyundai Grandeur
  'hyundai_grandeur_2497': { power: 202, note: '2.5 GDi' },
  'hyundai_grandeur_2999': { power: 248, note: '3.0 GDi' },
  'hyundai_grandeur_2359': { power: 180, note: '2.4 HEV' },

  // Hyundai Sonata
  'hyundai_sonata_1598': { power: 180, note: '1.6 T-GDi' },
  'hyundai_sonata_1999': { power: 160, note: '2.0 MPI' },
  'hyundai_sonata_2359': { power: 180, note: '2.4 HEV' },

  // Hyundai Elantra
  'hyundai_elantra_1598': { power: 123, note: '1.6 MPI' },
  'hyundai_elantra_1999': { power: 158, note: '2.0 MPI' },

  // Hyundai Staria
  'hyundai_staria_2199': { power: 177, note: '2.2 CRDi' },
  'hyundai_staria_3497': { power: 272, note: '3.5 MPI' },

  // Hyundai Venue
  'hyundai_venue_1591': { power: 123, note: '1.6 MPI' },

  // Kia Sportage
  'kia_sportage_1591': { power: 177, note: '1.6 T-GDi' },
  'kia_sportage_1999': { power: 150, note: '2.0 MPI' },
  'kia_sportage_2199': { power: 202, note: '2.2 CRDi' },

  // Kia Sorento
  'kia_sorento_1598': { power: 230, note: '1.6 T-GDi HEV' },
  'kia_sorento_1999': { power: 197, note: '2.0 T-GDi' },
  'kia_sorento_2199': { power: 202, note: '2.2 CRDi' },

  // Kia Carnival
  'kia_carnival_2199': { power: 202, note: '2.2 CRDi' },
  'kia_carnival_3497': { power: 272, note: '3.5 MPI' },
  'kia_carnival_1598': { power: 180, note: '1.6 T-GDi HEV' },

  // Kia Seltos
  'kia_seltos_1591': { power: 177, note: '1.6 T-GDi' },
  'kia_seltos_1999': { power: 150, note: '2.0 MPI' },

  // Kia K5
  'kia_k5_1598': { power: 180, note: '1.6 T-GDi' },
  'kia_k5_1999': { power: 160, note: '2.0 MPI' },
  'kia_k5_2497': { power: 202, note: '2.5 GDi' },

  // Kia K8
  'kia_k8_2497': { power: 202, note: '2.5 GDi' },
  'kia_k8_2999': { power: 248, note: '3.0 GDi' },
  'kia_k8_3497': { power: 290, note: '3.5 GDi' },

  // Kia Stinger
  'kia_stinger_1998': { power: 252, note: '2.0 T-GDi' },
  'kia_stinger_3342': { power: 370, note: '3.3 T-GDi' },

  // Genesis G70
  'genesis_g70_1998': { power: 252, note: '2.0 T-GDi' },
  'genesis_g70_3342': { power: 370, note: '3.3 T-GDi' },

  // Genesis G80
  'genesis_g80_2497': { power: 202, note: '2.5 T-GDi' },
  'genesis_g80_2999': { power: 278, note: '3.0 T-GDi' },

  // Genesis GV70
  'genesis_gv70_1998': { power: 252, note: '2.0 T-GDi' },
  'genesis_gv70_2999': { power: 380, note: '3.0 T-GDi' },

  // Genesis GV80
  'genesis_gv80_2497': { power: 277, note: '2.5 T-GDi' },
  'genesis_gv80_2999': { power: 380, note: '3.0 T-GDi' },

  // KGM Rexton
  'kgm_rexton_1998': { power: 177, note: '2.0 e-XDi' },

  // KGM Torres
  'kgm_torres_1497': { power: 170, note: '1.5 T-GDi' },

  // Renault Korea QM6
  'renaultkorea_qm6_1998': { power: 144, note: '2.0 MPI' },
  'renaultkorea_qm6_1461': { power: 160, note: '1.5 dCi' },
}

export function getPowerHp(brand: string, model: string, engineCc: number): number {
  if (!engineCc || engineCc <= 0) return 0

  // Нормализуем ключ
  const brandKey = brand.toLowerCase().replace(/\s+/g, '').replace('-', '')
  const modelKey = model.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')

  // Ищем точное совпадение
  const exactKey = `${brandKey}_${modelKey}_${engineCc}`
  if (POWER_MAP[exactKey]) return POWER_MAP[exactKey].power

  // Ищем ближайший объём (±100cc)
  const prefix = `${brandKey}_${modelKey}_`
  const candidates = Object.entries(POWER_MAP)
    .filter(([k]) => k.startsWith(prefix))
    .map(([k, v]) => ({
      cc: parseInt(k.replace(prefix, '')),
      power: v.power
    }))
    .filter(c => Math.abs(c.cc - engineCc) <= 100)
    .sort((a, b) => Math.abs(a.cc - engineCc) - Math.abs(b.cc - engineCc))

  if (candidates.length > 0) return candidates[0].power

  // Fallback — примерная оценка по объёму
  if (engineCc <= 1000) return 75
  if (engineCc <= 1400) return 100
  if (engineCc <= 1600) return 130
  if (engineCc <= 2000) return 150
  if (engineCc <= 2500) return 200
  if (engineCc <= 3000) return 250
  return 300
}
