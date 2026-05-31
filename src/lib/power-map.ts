// Mapping: badge_detail + engine_cc -> power (hp)
// Source: official Hyundai/Kia/Genesis Korea specifications
const BADGE_POWER_MAP: Record<string, number> = {
  'gasoline 1.6 turbo 2wd_1598': 180,
  'gasoline 1.6 turbo 2wd_1591': 177,
  'gasoline 2.0t 2wd_1998': 252,
  'gasoline 2.0t 4wd_1998': 252,
  'gasoline 2.5t 2wd_2497': 290,
  'diesel 2.0 2wd_1998': 186,
  'diesel 2.0 2wd_1995': 186,
  'diesel 2.2 2wd_2157': 202,
  'diesel 2.2 2wd_2151': 202,
  'diesel 2.2 4wd_2157': 202,
  'diesel 2.2 4wd_2151': 202,
  '2.5_2497': 202,
  '2.5 awd masters_2497': 202,
  '2.0_1999': 160,
  '2.0 lpi_1999': 152,
  '2.0 lpe re 2wd_1998': 152,
  '2.0 lpi(rent)_1999': 152,
  '1.6_1598': 180,
  '1.6 turbo_1598': 180,
  '7-seater limousine_2199': 202,
  '9-seater noblesse_2151': 202,
  '9-seater noblesse_2199': 202,
  '9-seater prstige_2199': 202,
  'cargo 5-seater_2199': 202,
  'hev 9seater nobless_1598': 180,
  'premium plus_1999': 180,
  'prestige_1999': 180,
  'inspiration_1580': 180,
  'inspiration 2wd_1598': 180,
  'modern_1999': 180,
  '2.0 gde le signature 2wd_1997': 160,
  'gasoline_1999': 160,
}

const BRAND_MODEL_MAP: Record<string, number> = {
  'hyundai_tucson_1598': 150,
  'hyundai_tucson_1998': 186,
  'hyundai_tucson_1999': 186,
  'hyundai_tucson_2151': 186,
  'hyundai_tucson_2199': 186,
  'hyundai_santafe_2151': 202,
  'hyundai_santafe_2157': 202,
  'hyundai_santafe_2199': 202,
  'hyundai_santafe_1598': 180,
  'hyundai_grandeur_2497': 202,
  'hyundai_grandeur_2999': 248,
  'hyundai_grandeur_2398': 180,
  'hyundai_sonata_1598': 180,
  'hyundai_sonata_1999': 160,
  'hyundai_staria_2199': 177,
  'hyundai_staria_3470': 294,
  'hyundai_staria_3497': 272,
  'hyundai_elantra_1598': 123,
  'hyundai_elantra_1999': 158,
  'kia_carnival_2199': 202,
  'kia_carnival_2151': 202,
  'kia_carnival_3470': 294,
  'kia_carnival_3497': 272,
  'kia_carnival_1598': 180,
  'kia_sportage_1598': 180,
  'kia_sportage_1591': 177,
  'kia_sportage_1999': 150,
  'kia_sportage_1998': 150,
  'kia_sportage_2151': 202,
  'kia_sportage_2199': 202,
  'kia_k5_1598': 180,
  'kia_k5_1999': 160,
  'kia_k5_1998': 160,
  'kia_k5_2497': 202,
  'kia_k8_2497': 202,
  'kia_k8_2999': 248,
  'kia_k8_3470': 300,
  'kia_seltos_1598': 177,
  'kia_seltos_1591': 177,
  'kia_seltos_1999': 150,
  'kia_seltos_1998': 150,
  'kia_stinger_1998': 252,
  'kia_stinger_3342': 370,
  'genesis_g70_1998': 252,
  'genesis_g70_3342': 370,
  'genesis_g80_2497': 202,
  'genesis_g80_2999': 278,
  'genesis_gv70_1998': 252,
  'genesis_gv80_2497': 277,
  'genesis_gv80_2999': 380,
  'kgm_rexton_1998': 177,
  'kgm_rexton_2157': 181,
  'kgm_torres_1497': 170,
  'renaultkorea_qm6_1998': 144,
  'renaultkorea_qm6_1461': 160,
}

export function getPowerHp(
  brand: string,
  model: string,
  engineCc: number,
  badgeDetail?: string,
): number {
  if (badgeDetail) {
    const badge = badgeDetail.toLowerCase().trim()
    const badgeKey = `${badge}_${engineCc}`
    if (BADGE_POWER_MAP[badgeKey]) return BADGE_POWER_MAP[badgeKey]
    if (BADGE_POWER_MAP[badge]) return BADGE_POWER_MAP[badge]
  }

  const brandKey = brand.toLowerCase().replace(/\s+/g, '').replace(/-/g, '')
  const modelKey = model.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
  const exactKey = `${brandKey}_${modelKey}_${engineCc}`
  if (BRAND_MODEL_MAP[exactKey]) return BRAND_MODEL_MAP[exactKey]

  if (engineCc <= 1000) return 75
  if (engineCc <= 1400) return 100
  if (engineCc <= 1600) return 130
  if (engineCc <= 2000) return 150
  if (engineCc <= 2500) return 200
  if (engineCc <= 3000) return 250
  return 300
}
