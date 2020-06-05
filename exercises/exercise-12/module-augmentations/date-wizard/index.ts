// This enabled module augmentation mode.
import 'date-wizard';

declare module 'date-wizard' {
  // Add your module extensions here.
  function pad(s: number): string;

  interface DateDetails {
    hours: number;
  }
}
