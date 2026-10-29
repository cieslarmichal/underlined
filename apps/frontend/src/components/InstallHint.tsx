import { Share, X } from 'lucide-react';
import { useState } from 'react';

const dismissedKey = 'underlined:install-hint-dismissed';

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(dismissedKey) === '1';
  } catch {
    return false;
  }
}

// iOS cannot prompt for installation, so we explain it once. Android proposes installation by itself.
export default function InstallHint() {
  const [visible, setVisible] = useState(() => isIos() && !isStandalone() && !wasDismissed());

  if (!visible) return null;

  function dismiss() {
    setVisible(false);

    try {
      localStorage.setItem(dismissedKey, '1');
    } catch {
      // The hint may show again next time; that is acceptable.
    }
  }

  return (
    <div className="mx-4 mt-3 flex items-start gap-3 rounded-xl border bg-secondary p-3 text-sm">
      <Share className="mt-0.5 size-5 shrink-0" />
      <p className="flex-1">
        Install the app: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. After installing you need
        to sign in once more.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-m-2 flex size-11 items-center justify-center"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
