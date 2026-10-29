export const nativeLanguages = ['pl', 'en'] as const;
export const bookLanguages = ['en', 'es'] as const;

export type NativeLanguage = (typeof nativeLanguages)[number];
export type BookLanguage = (typeof bookLanguages)[number];

export const languageNames: Record<NativeLanguage | BookLanguage, string> = {
  pl: 'Polish',
  en: 'English',
  es: 'Spanish',
};
