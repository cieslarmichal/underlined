import { site } from '../config';

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: 'website' | 'article';
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

const DEFAULT_SEO: Required<Pick<SEOConfig, 'title' | 'description' | 'ogType'>> = {
  title: site.name,
  description: site.description,
  ogType: 'website',
};

export function updateMetaTags(config: SEOConfig): void {
  const title = config.title ?? DEFAULT_SEO.title;
  const description = config.description ?? DEFAULT_SEO.description;
  const ogType = config.ogType ?? DEFAULT_SEO.ogType;

  document.title = title;

  setMeta('name', 'description', description);

  if (config.keywords && config.keywords.length > 0) {
    setMeta('name', 'keywords', config.keywords.join(', '));
  }

  const robotsParts: string[] = [];
  if (config.noindex) robotsParts.push('noindex');
  if (config.nofollow) robotsParts.push('nofollow');
  setMeta('name', 'robots', robotsParts.length > 0 ? robotsParts.join(', ') : 'index, follow');

  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:type', ogType);
  setMeta('property', 'og:url', config.canonical ?? window.location.href);

  if (config.ogImage) {
    setMeta('property', 'og:image', config.ogImage);
    if (config.ogImageAlt) setMeta('property', 'og:image:alt', config.ogImageAlt);
    setMeta('name', 'twitter:image', config.ogImage);
    if (config.ogImageAlt) setMeta('name', 'twitter:image:alt', config.ogImageAlt);
  }

  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);

  setCanonical(config.canonical ?? window.location.href);
}

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url: string): void {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = url;
}
