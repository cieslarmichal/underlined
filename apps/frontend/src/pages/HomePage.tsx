import { site } from '../config';
import { useSEO } from '../hooks/useSEO';

export default function HomePage() {
  useSEO({ title: site.name, description: site.description, canonical: site.url });

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 sm:px-6 lg:px-8 py-24">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight tracking-tight">
          {site.name}
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground font-light">Start building.</p>
      </div>
    </div>
  );
}
