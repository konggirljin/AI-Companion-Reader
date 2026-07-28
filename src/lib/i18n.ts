export type Lang = 'en' | 'zh-TW';

const STRINGS: Record<string, { en: string; 'zh-TW': string }> = {
  'language.title': { en: 'Language / 語言', 'zh-TW': '語言 / Language' },
  'language.description': { en: 'Choose the display language for the app interface.', 'zh-TW': '選擇應用程式介面的顯示語言。' },

  'profile.title': { en: 'Profile', 'zh-TW': '個人設定' },
  'profile.subtitle': { en: 'App and provider settings', 'zh-TW': '應用程式與供應商設定' },

  'systemPrompt.title': { en: 'System Prompt', 'zh-TW': '系統提示詞' },
  'systemPrompt.description': { en: 'Controls how companions behave. Must contain {{personas}} where companion profiles are inserted.', 'zh-TW': '控制伴侶的行為。必須包含 {{personas}} 佔位符以插入伴侶資料。' },
  'systemPrompt.reset': { en: 'Reset to default', 'zh-TW': '重置為預設' },
  'systemPrompt.saved': { en: 'System prompt saved', 'zh-TW': '系統提示詞已儲存' },
  'systemPrompt.resetToast': { en: 'Reset to default', 'zh-TW': '已重置為預設' },
  'systemPrompt.mustContainPersonas': { en: 'Template must contain {{personas}}. That is where companion profiles are inserted.', 'zh-TW': '模板必須包含 {{personas}}，此為插入伴侶資料的位置。' },

  'common.save': { en: 'Save', 'zh-TW': '儲存' },

  'nav.library': { en: 'Bookshelf', 'zh-TW': '書架' },
  'nav.journey': { en: 'Journey', 'zh-TW': '旅程' },
  'nav.persona': { en: 'Persona', 'zh-TW': '角色' },
  'nav.profile': { en: 'Profile', 'zh-TW': '個人' },

  'reader.backToShelf': { en: 'Back to shelf', 'zh-TW': '返回書架' },
  'reader.tableOfContents': { en: 'Table of contents', 'zh-TW': '目錄' },
  'reader.bookmarks': { en: 'Bookmarks', 'zh-TW': '書籤' },
  'reader.comments': { en: 'Comments', 'zh-TW': '留言' },
  'reader.settings': { en: 'Reader settings', 'zh-TW': '閱讀設定' },
  'reader.settings.popover': { en: 'Reading settings', 'zh-TW': '閱讀設定' },
  'reader.fontSize': { en: 'Font size', 'zh-TW': '字型大小' },
  'reader.lineSpacing': { en: 'Line spacing', 'zh-TW': '行距' },
  'reader.fontFamily': { en: 'Font family', 'zh-TW': '字型' },
  'reader.readingTheme': { en: 'Reading theme', 'zh-TW': '佈景主題' },
  'reader.theme.amber': { en: 'Amber (dark)', 'zh-TW': '琥珀（深色）' },
  'reader.theme.warmWhite': { en: 'Warm white', 'zh-TW': '暖白' },
  'reader.theme.sepia': { en: 'Sepia', 'zh-TW': '復古' },
  'reader.theme.green': { en: 'Soft green', 'zh-TW': '柔綠' },
  'language.confirm': { en: 'Language switched to {lang}', 'zh-TW': '語言已切換為 {lang}' },
};

export function t(lang: Lang, key: string): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en ?? key;
}

export function getStrings(): Record<string, { en: string; 'zh-TW': string }> {
  return STRINGS;
}
