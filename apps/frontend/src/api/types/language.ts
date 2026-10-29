export type NativeLanguage = 'pl' | 'en';
export type BookLanguage = 'en' | 'es';

export const nativeLanguages: NativeLanguage[] = ['pl', 'en'];
export const bookLanguages: BookLanguage[] = ['en', 'es'];

export const languageNames: Record<NativeLanguage | BookLanguage, string> = {
  pl: 'Polish',
  en: 'English',
  es: 'Spanish',
};
