import { Camera, Languages, PencilLine } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { site } from '../config';
import { useSEO } from '../hooks/useSEO';

const steps = [
  {
    icon: PencilLine,
    title: 'Underline',
    text: 'Read your paper book and underline the words you do not know with a pencil.',
  },
  {
    icon: Camera,
    title: 'Photograph',
    text: 'Take a photo of the page. Nothing else to enter: no book, no page number.',
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
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
        <span className="underline decoration-yellow-400 decoration-4 underline-offset-8">Underline</span> a word.
        <br />
        Keep reading.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Photograph the words you underlined in a paper book. Underlined finds them, shows the sentence they come from
        and translates them as they are used there.
      </p>
      <div className="mt-8 flex gap-3">
        <Button
          asChild
          size="lg"
          className="h-12 px-8 text-base"
        >
          <Link to="/register">Get started</Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-12 px-8 text-base"
        >
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
      <ul className="mt-16 grid gap-8 text-left sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <Icon className="size-7" />
            <h2 className="mt-3 font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
