import { FolderIcon, EyeIcon, LockIcon } from './icons/FeatureIcons';
import { useLang } from '../lib/LangContext';

const FEATS = [
  {
    Icon: FolderIcon,
    title: ['Tous formats acceptés', 'All formats accepted'],
    desc: [
      "PDF, Word, Excel, texte brut — importez votre document tel quel.",
      'PDF, Word, Excel, plain text — import as is.',
    ],
  },
  {
    Icon: EyeIcon,
    title: ['Visualisation fidèle', 'Faithful preview'],
    desc: [
      'Voyez exactement ce que vos enquêteurs verront sur le terrain, avant déploiement.',
      'See exactly what your enumerators will see in the field, before deployment.',
    ],
  },
  {
    Icon: LockIcon,
    title: ['Sécurisé & confidentiel', 'Secure & confidential'],
    desc: [
      'Vos documents et identifiants sont traités de façon sécurisée et ne sont jamais conservés.',
      'Your documents and credentials are processed securely and never stored.',
    ],
  },
];

export default function Features() {
  const { t } = useLang();
  return (
    <div className="features" style={{ marginTop: 36 }}>
      {FEATS.map((f, i) => (
        <div className="feat" key={i}>
          <div className="feat-icon"><f.Icon /></div>
          <div className="feat-title">{t(...f.title)}</div>
          <div className="feat-desc">{t(...f.desc)}</div>
        </div>
      ))}
    </div>
  );
}
