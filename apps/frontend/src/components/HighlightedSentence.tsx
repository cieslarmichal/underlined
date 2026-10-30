interface Props {
  sentence: string;
  word: string;
}

// Shows the book sentence with the underlined word emphasised.
export default function HighlightedSentence({ sentence, word }: Props) {
  const index = word ? sentence.toLowerCase().indexOf(word.toLowerCase()) : -1;

  if (index === -1) {
    return <>{sentence}</>;
  }

  return (
    <>
      {sentence.slice(0, index)}
      <mark className="rounded-[3px] bg-transparent bg-[linear-gradient(to_top,var(--highlight)_58%,transparent_58%)] px-0.5 font-semibold text-inherit">
        {sentence.slice(index, index + word.length)}
      </mark>
      {sentence.slice(index + word.length)}
    </>
  );
}
