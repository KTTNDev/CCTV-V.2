'use client';

import {
  useEffect,
  useRef,
} from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface ModalAccessibilityOptions {
  isOpen: boolean;
  onClose: () => void;
  closeDisabled?: boolean;
}

export function useModalAccessibility<
  T extends HTMLElement = HTMLDivElement,
>({
  isOpen,
  onClose,
  closeDisabled = false,
}: ModalAccessibilityOptions) {
  const dialogRef = useRef<T>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const focusFrame =
      window.requestAnimationFrame(() => {
        dialogRef.current?.focus({
          preventScroll: true,
        });
      });

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === 'Escape' &&
        !closeDisabled
      ) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const focusableElements =
        Array.from(
          dialog.querySelectorAll<HTMLElement>(
            FOCUSABLE_SELECTOR,
          ),
        ).filter(
          (element) =>
            !element.hidden &&
            element.getAttribute('aria-hidden') !==
              'true' &&
            element.getClientRects().length > 0,
        );

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement =
        focusableElements[0];
      const lastElement =
        focusableElements[
          focusableElements.length - 1
        ];
      const activeElement =
        document.activeElement;

      if (
        event.shiftKey &&
        (activeElement === firstElement ||
          !dialog.contains(activeElement))
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        (activeElement === lastElement ||
          !dialog.contains(activeElement))
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      window.cancelAnimationFrame(
        focusFrame,
      );

      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );

      document.body.style.overflow =
        previousOverflow;

      previouslyFocused?.focus({
        preventScroll: true,
      });
    };
  }, [
    closeDisabled,
    isOpen,
    onClose,
  ]);

  return dialogRef;
}
