import { LIFE_TEMPLATES } from '../types'

/** Stable DE titles → i18n keys (storage keeps DE titles for compat) */
const LIFE_TITLE_KEYS: Record<string, string> = {
  'Mit dem Hund gehen': 'plan.life.templates.walkDog',
  'Essen kochen / essen': 'plan.life.templates.cook',
  'Rechtzeitig schlafen gehen': 'plan.life.templates.sleep',
  'Medikamente nehmen': 'plan.life.templates.meds',
  'Kurz bewegen / spazieren': 'plan.life.templates.move',
  'Post / Besorgungen': 'plan.life.templates.errands',
}

export function lifeTemplateLabel(
  title: string,
  t: (key: string) => string,
): string {
  const key = LIFE_TITLE_KEYS[title]
  return key ? t(key) : title
}

export { LIFE_TEMPLATES }
