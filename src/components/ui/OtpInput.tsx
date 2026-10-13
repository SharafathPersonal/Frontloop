'use client';

import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

export const OTP_LENGTH = 6;

export const emptyOtp = () => Array.from({ length: OTP_LENGTH }, () => '');

interface OtpInputProps {
  /** One entry per box; '' when empty. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Called once all boxes hold a digit, with the full code. */
  onComplete?: (code: string) => void;
  /** id of the visible label for the group. */
  labelledBy: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * Six single-digit boxes with auto-advance, Backspace to the previous box, arrow
 * keys, paste of a whole code into any box, and `autocomplete="one-time-code"`
 * so iOS and Android can fill the code straight from the email notification.
 */
export function OtpInput({ value, onChange, onComplete, labelledBy, describedBy, invalid, disabled }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const focusBox = (index: number) => {
    const box = refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))];
    box?.focus();
    box?.select();
  };

  /** Writes digits starting at `start` (one for typing, several for paste or autofill). */
  const fillFrom = (start: number, digits: string) => {
    const next = [...value];
    for (let i = 0; i < digits.length && start + i < OTP_LENGTH; i++) next[start + i] = digits[i];
    onChange(next);
    focusBox(start + digits.length);
    if (next.every(Boolean)) onComplete?.(next.join(''));
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      const next = [...value];
      next[index] = '';
      onChange(next);
      return;
    }
    // A single keystroke into a filled box arrives as "old+new"; keep only the new digit.
    fillFrom(index, digits.length === 2 && value[index] ? digits.slice(-1) : digits);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      e.preventDefault();
      const next = [...value];
      next[index - 1] = '';
      onChange(next);
      focusBox(index - 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!digits) return;
    e.preventDefault();
    // A full code always fills from the first box, wherever it was pasted.
    fillFrom(digits.length === OTP_LENGTH ? 0 : index, digits);
  };

  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy} className="flex justify-between gap-2">
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
          aria-invalid={invalid ? true : undefined}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={(e) => e.target.select()}
          className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-mono font-bold text-[#0F172A] bg-[#FFFFFF] border rounded-lg outline-none transition-colors focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 disabled:opacity-50 ${
            invalid ? 'border-rose-400' : 'border-[#E2E8F0]'
          }`}
        />
      ))}
    </div>
  );
}
