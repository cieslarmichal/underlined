import { Camera, Languages, PencilLine, Plus } from 'lucide-react';
import { useContext } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { languageNames } from '../api/types/language';
import { AuthContext } from '../context/AuthContext';
import Logo from './Logo';

const steps = [
  { icon: PencilLine, text: 'Underline words you do not know with a pencil while you read.' },
  { icon: Camera, text: 'Photograph the page. That is all you do: nothing to type.' },
  { icon: Languages, text: 'Get each word in the meaning it has in that sentence, then read on.' },
];

interface Props {
  onAddBook: () => void;
}

// Shown to a new reader with an empty library: what the app does, and one clear next step.
export default function FirstBookIntro({ onAddBook }: Props) {
  const { userData } = useContext(AuthContext);
  const language = userData ? languageNames[userData.nativeLanguage] : null;

  return (
    <div className="rounded-3xl border bg-card px-6 py-10 text-center shadow-xs sm:px-10">
      <Logo className="mx-auto size-14" />
      <h2 className="mt-6 font-serif text-3xl font-semibold tracking-tight">Add the book you are reading</h2>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        Tell us once which book it is. After that, every photo of a page is just one tap.
      </p>

      <ol className="mx-auto mt-8 max-w-md space-y-4 text-left">
        {steps.map(({ icon: Icon, text }, index) => (
          <li
            key={text}
            className="flex items-start gap-4"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
              <Icon className="size-5" />
            </span>
            <p className="pt-1.5 text-sm leading-relaxed">
              <span className="sr-only">Step {index + 1}: </span>
              {text}
            </p>
          </li>
        ))}
      </ol>

      <Button
        size="lg"
        className="mt-8 h-12 w-full max-w-xs px-7 text-base"
        onClick={onAddBook}
      >
        <Plus /> Add your first book
      </Button>

      {language && (
        <p className="mt-4 text-xs text-muted-foreground">
          Words will be explained in {language}.{' '}
          <Link
            to="/profile"
            className="underline underline-offset-4"
          >
            Change
          </Link>
        </p>
      )}
    </div>
  );
}
