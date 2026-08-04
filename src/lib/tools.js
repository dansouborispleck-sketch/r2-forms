import { KoboIcon, OdkIcon, JotformIcon, GridIcon, GoogleFormsIcon } from '../components/icons/ToolIcons';

export const TOOLS = [
  { id: 'kobo', Icon: KoboIcon, color: '#2E7DE1', name: 'KoboToolbox', desc: ['ONG & humanitaire', 'NGO & humanitarian'], signupUrl: 'https://www.kobotoolbox.org/sign-up/' },
  { id: 'odk', Icon: OdkIcon, color: '#4C9A2A', name: 'ODK Central', desc: ['Open source', 'Open source'], signupUrl: 'https://getodk.org/' },
  { id: 'jotform', Icon: JotformIcon, color: '#FF6100', name: 'JotForm', desc: ['Tous secteurs', 'All sectors'], signupUrl: 'https://www.jotform.com/signup/' },
  { id: 'xlsform', Icon: GridIcon, color: '#166534', name: 'XLSForm', desc: ['Fichier Excel', 'Excel file'], signupUrl: 'https://www.kobotoolbox.org/sign-up/' },
  { id: 'excel', Icon: GridIcon, color: '#21A366', name: 'Excel', desc: ['Masque de saisie', 'Data entry mask'], signupUrl: null },
  { id: 'google', Icon: GoogleFormsIcon, color: '#673AB7', name: 'Google Forms', desc: ['Script prêt', 'Ready script'], signupUrl: 'https://accounts.google.com/signup' },
];

export function toolById(id) {
  return TOOLS.find((t) => t.id === id) || TOOLS[0];
}
