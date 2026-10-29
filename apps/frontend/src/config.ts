import { z } from 'zod';

/**
 * Single place to rebrand the app. Everything user-facing — header, footer,
 * page titles, meta tags — reads from here.
 */
export const site = {
  name: 'Underlined',
  description: 'Photograph the words you underlined in a paper book and get their meaning in context.',
  url: 'https://underlined.com',
  contactEmail: 'contact@underlined.com',
  githubUrl: 'https://github.com/cieslarmichal/underlined',
  author: 'Michał Cieślar',
  authorUrl: 'https://github.com/cieslarmichal',
} as const;

const appConfig = {
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
};

const configSchema = z.object({
  backendUrl: z.string().min(1),
});

export type Config = z.infer<typeof configSchema>;

export function createConfig(): Config {
  const parsedConfig = configSchema.safeParse(appConfig);

  if (!parsedConfig.success) {
    console.error(parsedConfig.error);
    throw new Error('Configuration error');
  }

  return parsedConfig.data;
}

export const config = createConfig();
