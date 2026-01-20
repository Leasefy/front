'use client';

import { useState, useEffect } from 'react';

interface TimeGreeting {
  greeting: string;
  emoji: string;
}

/**
 * Returns a time-based greeting in Spanish
 * - 5:00 - 11:59 → Buenos días
 * - 12:00 - 17:59 → Buenas tardes
 * - 18:00 - 4:59 → Buenas noches
 */
export function useTimeGreeting(): TimeGreeting {
  const [greeting, setGreeting] = useState<TimeGreeting>({
    greeting: 'Buen día',
    emoji: '👋',
  });

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      setGreeting({ greeting: 'Buenos días', emoji: '☀️' });
    } else if (hour >= 12 && hour < 18) {
      setGreeting({ greeting: 'Buenas tardes', emoji: '🌤️' });
    } else {
      setGreeting({ greeting: 'Buenas noches', emoji: '🌙' });
    }
  }, []);

  return greeting;
}
