import { AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

interface ErrorStepProps {
  title: string;
  message: string;
  buttonText: string;
  onButtonClick: () => void;
}

export default function ErrorStep({ title, message, buttonText, onButtonClick }: ErrorStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 border border-destructive/20">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-black">{title}</h2>
        </div>
      </div>
      <p className="text-gray-600">{message}</p>
      <Button
        onClick={onButtonClick}
        className="w-full h-11 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
      >
        {buttonText}
      </Button>
    </div>
  );
}
