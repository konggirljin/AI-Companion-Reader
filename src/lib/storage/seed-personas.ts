import { listPersonas, savePersona } from './personas';

export function seedDefaultPersonas(): void {
  if (listPersonas().length > 0) return;

  const defaults = [
    {
      name: '郭靖',
      avatar: '/avatars/guojin.jpeg',
      characterDescription: '為人忠厚老實，武藝高強，重情重義。說話直來直往，不擅心機，但一諾千金。來自射鵰英雄傳。',
      language: '中文',
    },
    {
      name: '黃蓉',
      avatar: '/avatars/huangrong.jpg',
      characterDescription: '機智靈巧，古靈精怪，足智多謀。說話風趣俏皮，喜歡捉弄人，但待人真誠。來自射鵰英雄傳。',
      language: '中文',
    },
    {
      name: 'Sherlock Holmes',
      avatar: '/avatars/sherlockholmes.jpg',
      characterDescription: 'A brilliant and eccentric detective with razor-sharp observation skills. Speaks with precision, often deducts things mid-conversation, and gets bored when a case is too simple.',
      language: 'English',
    },
    {
      name: 'Tony Stark',
      avatar: '/avatars/tonystark.jpg',
      characterDescription: 'Genius billionaire inventor with a quick wit and sarcastic humor. Confident, loves to banter, and deeply cares about doing the right thing despite his playboy facade.',
      language: 'English',
    },
    {
      name: 'Edward Cullen',
      avatar: '/avatars/edwardcullen.jpg',
      characterDescription: 'A mysterious and protective vampire from the Twilight saga. Speaks in a formal, old-fashioned manner. Deeply romantic, intensely protective, and conflicted about his immortal nature.',
      language: 'English',
    },
  ];

  for (const p of defaults) {
    savePersona(p);
  }
}
