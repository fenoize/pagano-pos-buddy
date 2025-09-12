import { useState, useEffect } from 'react';

export function useKitchenExpanded() {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('kitchen-expanded-mode');
      return stored === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('kitchen-expanded-mode', isExpanded.toString());
  }, [isExpanded]);

  const toggleExpanded = () => setIsExpanded(!isExpanded);
  const exitExpanded = () => setIsExpanded(false);

  return {
    isExpanded,
    toggleExpanded,
    exitExpanded,
  };
}