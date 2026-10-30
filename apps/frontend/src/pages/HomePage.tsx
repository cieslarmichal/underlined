import { Camera, Languages, PencilLine } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import HighlightedSentence from '../components/HighlightedSentence';
import { site } from '../config';
import { useSEO } from '../hooks/useSEO';

const steps = [
  {
    icon: PencilLine,
    title: 'Underline',
    text: 'Read your paper book as usual and underline the words you do not know with a pencil.',
  },
  {
    icon: Camera,
    title: 'Photograph',
    text: 'Take a photo of the page. There is nothing to type: no book, no page number.',
  },
  {
    icon: Languages,
    title: 'Understand',
    text: 'Get each word in the meaning it has in that sentence, then keep reading.',
  },
];

export default function HomePage() {
  useSEO({ title: site.name, description: site.description, canonical: site.url });

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-12 sm:pt-20 lg:px-6">
      <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-6xl">
            <span className="bg-[linear-gradient(to_top,var(--highlight)_32%,transparent_32%)] px-1">Underline</span> a
            word. Keep reading.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Photograph the words you underlined in a paper book. Underlined finds them, keeps the sentence they come
            from and explains them the way the book uses them.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 px-7 text-base"
            >
              <Link to="/register">Get started</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-7 text-base"
            >
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <figure
          aria-label="Example of a saved word"
          className="rotate-1 rounded-2xl border bg-card p-6 shadow-[0_12px_40px_-16px_rgba(60,40,0,0.25)]"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From your book</p>
          <blockquote className="mt-3 font-serif text-2xl leading-relaxed">
            <HighlightedSentence
              sentence="El viento susurraba entre los árboles."
              word="susurraba"
            />
          </blockquote>
          <p className="mt-5 border-t pt-4 text-base">
            <span className="font-semibold">susurrar</span> <span className="text-muted-foreground">→</span> to whisper
          </p>
        </figure>
      </section>

      <section className="mt-24">
        <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <li
              key={title}
              className="rounded-2xl border bg-card p-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-medium text-muted-foreground">Step {index + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
