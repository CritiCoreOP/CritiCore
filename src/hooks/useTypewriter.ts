import { useState, useEffect, useCallback, useRef } from "react";

interface UseTypewriterOptions {
  phrases: string[];
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseDuration?: number;
  deletePauseDuration?: number;
}

/**
 * Material CC typewriter hook.
 * Cycles through phrases with type/delete animation.
 */
export function useTypewriter({
  phrases,
  typeSpeed = 65,
  deleteSpeed = 35,
  pauseDuration = 300,
  deletePauseDuration = 1200,
}: UseTypewriterOptions) {
  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const phrase = phrases[phraseIndex];

    const step = () => {
      if (!isDeleting) {
        const next = phrase.slice(0, text.length + 1);
        setText(next);
        if (next === phrase) {
          timeoutRef.current = setTimeout(() => setIsDeleting(true), deletePauseDuration);
          return;
        }
        timeoutRef.current = setTimeout(step, typeSpeed);
      } else {
        const next = phrase.slice(0, text.length - 1);
        setText(next);
        if (next === "") {
          setIsDeleting(false);
          setPhraseIndex((phraseIndex + 1) % phrases.length);
          timeoutRef.current = setTimeout(step, pauseDuration);
          return;
        }
        timeoutRef.current = setTimeout(step, deleteSpeed);
      }
    };

    timeoutRef.current = setTimeout(step, isDeleting ? deleteSpeed : typeSpeed);
    return () => clearTimeout(timeoutRef.current);
  }, [text, phraseIndex, isDeleting, phrases, typeSpeed, deleteSpeed, pauseDuration, deletePauseDuration]);

  const restart = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setText("");
    setPhraseIndex(0);
    setIsDeleting(false);
  }, []);

  return { text, restart };
}
