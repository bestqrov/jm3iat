import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type FontFamily = 'Cairo' | 'Tajawal' | 'Noto Sans Arabic' | 'Changa';
export type ThemeColor = 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'teal';

interface AppearanceState {
  fontFamily: FontFamily;
  themeColor: ThemeColor;
}

interface AppearanceContextValue extends AppearanceState {
  setFont: (font: FontFamily) => void;
  setColor: (color: ThemeColor) => void;
}

const STORAGE_KEY = 'mareac_appearance';

const COLORS: Record<ThemeColor, { label: string; labelAr: string; hex: string; hsl600: string; hsl700: string }> = {
  blue:   { label: 'Bleu',   labelAr: 'أزرق',   hex: '#0284c7', hsl600: '201 96% 32%',  hsl700: '201 96% 26%' },
  green:  { label: 'Vert',   labelAr: 'أخضر',   hex: '#16a34a', hsl600: '142 71% 45%',  hsl700: '142 71% 36%' },
  purple: { label: 'Violet', labelAr: 'بنفسجي', hex: '#7c3aed', hsl600: '262 83% 58%',  hsl700: '262 83% 48%' },
  red:    { label: 'Rouge',  labelAr: 'أحمر',   hex: '#dc2626', hsl600: '0 72% 51%',    hsl700: '0 72% 42%'  },
  orange: { label: 'Orange', labelAr: 'برتقالي',hex: '#f97316', hsl600: '25 95% 53%',   hsl700: '25 95% 44%'  },
  teal:   { label: 'Sarcelle',labelAr: 'فيروزي',hex: '#0d9488', hsl600: '175 61% 41%',  hsl700: '175 61% 32%'  },
};

const FONTS: FontFamily[] = ['Cairo', 'Tajawal', 'Noto Sans Arabic', 'Changa'];

export { COLORS, FONTS };

const DEFAULT: AppearanceState = { fontFamily: 'Cairo', themeColor: 'blue' };

const AppearanceContext = createContext<AppearanceContextValue>({
  ...DEFAULT,
  setFont: () => {},
  setColor: () => {},
});

export const useAppearance = () => useContext(AppearanceContext);

const applyFont = (font: FontFamily) => {
  // Load from Google Fonts if not already loaded
  const id = `gfont-${font.replace(/\s+/g, '-').toLowerCase()}`;
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }
  document.documentElement.style.setProperty('--app-font', `'${font}', sans-serif`);
};

const applyColor = (color: ThemeColor) => {
  const c = COLORS[color];
  const root = document.documentElement;
  root.style.setProperty('--color-primary-600', c.hsl600);
  root.style.setProperty('--color-primary-700', c.hsl700);
  root.style.setProperty('--color-primary-50',  c.hsl600.split(' ').map((v, i) => i === 2 ? '96%' : v).join(' '));
};

export const AppearanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppearanceState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT, ...JSON.parse(saved) } : DEFAULT;
    } catch { return DEFAULT; }
  });

  useEffect(() => {
    applyFont(state.fontFamily);
    applyColor(state.themeColor);
  }, []);

  const setFont = (fontFamily: FontFamily) => {
    setState(prev => {
      const next = { ...prev, fontFamily };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      applyFont(fontFamily);
      return next;
    });
  };

  const setColor = (themeColor: ThemeColor) => {
    setState(prev => {
      const next = { ...prev, themeColor };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      applyColor(themeColor);
      return next;
    });
  };

  return (
    <AppearanceContext.Provider value={{ ...state, setFont, setColor }}>
      {children}
    </AppearanceContext.Provider>
  );
};
