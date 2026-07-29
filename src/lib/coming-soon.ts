import { toast } from 'sonner';
import { t } from '@/lib/i18n';
import { getSettings } from '@/lib/storage/settings';

export function comingSoon(label?: string) {
  toast(label
    ? t(getSettings().language, 'common.comingSoon', { label })
    : t(getSettings().language, 'common.comingSoonDefault'));
}
