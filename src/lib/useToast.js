import { useCallback, useRef, useState } from 'react';

export function useToast() {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((msg, duration = 3000) => {
    setMessage(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), duration);
  }, []);

  return { message, showToast };
}
