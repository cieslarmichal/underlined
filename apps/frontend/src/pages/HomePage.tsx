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

const examples = [
  {
    pair: 'EN → PL',
    sentence: 'They had a picnic on the bank of the river.',
    word: 'bank',
    lemma: 'bank',
    meaning: 'brzeg',
    note: 'Nie „bank”: znaczenie wynika z tego zdania.',
    tilt: 'lg:-rotate-1',
  },
  {
    pair: 'ES → PL',
    sentence: 'El viento susurraba entre los árboles.',
    word: 'susurraba',
    lemma: 'susurrar',
    meaning: 'szeptać',
    note: 'Forma podstawowa i znaczenie od razu.',
    tilt: 'lg:rotate-1 lg:ml-8',
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
          <p className="mt-5 text-sm text-muted-foreground">
            English and Spanish books, with meanings in Polish or English.
          </p>
        </div>

        <div className="space-y-5">
          {examples.map(({ pair, sentence, word, lemma, meaning, note, tilt }) => (
            <figure
              key={pair}
              aria-label={`Example of a saved word, ${pair}`}
              className={`rounded-2xl border bg-card p-6 shadow-[0_12px_40px_-18px_rgba(60,40,0,0.25)] ${tilt}`}
            >
              <figcaption className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>From your book</span>
                <span className="rounded-full bg-highlight-soft px-2.5 py-1 text-highlight-foreground">{pair}</span>
              </figcaption>
              <blockquote className="mt-3 font-serif text-2xl leading-relaxed">
                <HighlightedSentence
                  sentence={sentence}
                  word={word}
                />
              </blockquote>
              <p className="mt-5 border-t pt-4 text-base">
                <span className="font-semibold">{lemma}</span> <span className="text-muted-foreground">→</span>{' '}
                <span className="font-semibold">{meaning}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{note}</p>
            </figure>
          ))}
        </div>
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
