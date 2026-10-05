// Memes regles que le serveur (countRealQuestions) — sert uniquement a AFFICHER le prix ;
// le montant reellement facture est toujours decide par le serveur.
const NON_QUESTION_TYPES = ['begin_group', 'end_group', 'begin_repeat', 'end_repeat', 'note', 'calculate',
  'start', 'end', 'today', 'deviceid', 'subscriberid', 'simserial', 'phonenumber', 'username', 'audit'];

export const LARGE_THRESHOLD = 100;

export function countRealQuestions(xlsform) {
  return ((xlsform && xlsform.survey) || []).filter((r) => !NON_QUESTION_TYPES.includes(String(r.type || '').trim())).length;
}

// Traduction ou redeploiement : 3 $ jusqu'a 100 questions, 5 $ au-dela.
export function reusePriceUsd(xlsform) {
  return countRealQuestions(xlsform) > LARGE_THRESHOLD ? 5 : 3;
}
