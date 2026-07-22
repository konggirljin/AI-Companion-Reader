import { toast } from 'sonner';

export function comingSoon(label?: string) {
  toast(label ? `${label} is coming soon` : 'Coming soon');
}
