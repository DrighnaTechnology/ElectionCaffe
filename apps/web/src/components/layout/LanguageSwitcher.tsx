import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { GlobeIcon } from 'lucide-react';

const LANGUAGES = [
  { code: '', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'hi', label: '\u0939\u093F\u0928\u094D\u0926\u0940', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'bn', label: '\u09AC\u09BE\u0982\u09B2\u09BE', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'ta', label: '\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'te', label: '\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'kn', label: '\u0C95\u0CA8\u0CCD\u0CA8\u0CA1', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'ml', label: '\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'mr', label: '\u092E\u0930\u093E\u0920\u0940', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'gu', label: '\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'pa', label: '\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'or', label: '\u0B13\u0B21\u0B3C\u0B3F\u0B06', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'ur', label: '\u0627\u0631\u062F\u0648', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'as', label: '\u0985\u09B8\u09AE\u09C0\u09AF\u09BC\u09BE', flag: '\u{1F1EE}\u{1F1F3}' },
];

function changeLanguage(langCode: string) {
  const domain = window.location.hostname;
  if (langCode === '') {
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + domain;
  } else {
    const value = '/en/' + langCode;
    document.cookie = 'googtrans=' + value + '; path=/;';
    document.cookie = 'googtrans=' + value + '; path=/; domain=.' + domain;
  }
  window.location.reload();
}

export function LanguageSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" title="Change Language">
          <GlobeIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
          Select Language
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className="cursor-pointer"
          >
            <span className="mr-2 text-base">{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
