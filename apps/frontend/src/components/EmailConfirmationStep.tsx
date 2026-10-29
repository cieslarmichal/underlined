import { CheckCircle2, Mail } from 'lucide-react';
import { Button } from './ui/Button';

interface EmailConfirmationStepProps {
  title: string;
  message: string;
  buttonText: string;
  onButtonClick: () => void;
  icon?: 'email' | 'check';
}

export default function EmailConfirmationStep({
  title,
  message,
  buttonText,
  onButtonClick,
  icon,
}: EmailConfirmationStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
          {icon === 'check' ? (
            <CheckCircle2 className="h-6 w-6 text-black" />
          ) : (
            <Mail className="h-6 w-6 text-black" />
          )}
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
