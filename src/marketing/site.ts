export const SITE = {
  name: 'Tagesanker',
  url: 'https://tagesanker.de',
  email: 'info@tagesanker.de',
  tagline: 'Eine Sache. Realistisch. Zurückfinden.',
  description:
    'Tagesanker hilft dir, den Tag mit einer Sache nach der anderen zu halten — ohne Scores, ohne Streaks, ohne Druck.',
} as const

export const PROVIDER = {
  name: 'Karina Peters',
  legalForm: 'Einzelunternehmen',
  street: 'Im Krähwinkel 10',
  zipCity: '52441 Linnich',
  email: 'info@tagesanker.de',
  vatId: 'DE323878495',
  taxId: '213/5078/2938',
} as const

export function setPageMeta(title: string, description: string) {
  document.title = title
  const el = document.querySelector('meta[name="description"]')
  if (el) el.setAttribute('content', description)
}
