import { useEffect } from 'react';
import { updateMetaTags, type SEOConfig } from '../utils/seo';

export function useSEO(config: SEOConfig): void {
  useEffect(() => {
    updateMetaTags(config);

    return () => {
      updateMetaTags({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.title, config.description, config.canonical]);
}
