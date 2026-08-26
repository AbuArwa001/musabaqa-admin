import type en from '@/dictionaries/en.json'

export type Dict = typeof en
export type Locale = 'en' | 'ar'

const dictionaries: Record<Locale, () => Promise<Dict>> = {
  en: () => import('@/dictionaries/en.json').then(m => m.default),
  ar: () => import('@/dictionaries/ar.json').then(m => m.default),
}

export async function getDictionary(locale: string): Promise<Dict> {
  const loc = (locale === 'ar' ? 'ar' : 'en') as Locale
  return dictionaries[loc]()
}

export function isValidLocale(locale: string): locale is Locale {
  return locale === 'en' || locale === 'ar'
}
