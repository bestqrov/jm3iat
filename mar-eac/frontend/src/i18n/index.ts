import ar from './ar';
import fr from './fr';

export type Lang = 'ar' | 'fr';
export const translations = { ar, fr };
export type Translations = typeof ar;
export { ar, fr };
