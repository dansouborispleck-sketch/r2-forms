// Photo de litchi (coque brisee revelant le fruit) extraite du questionnaire d'exemple,
// conservee telle quelle sans retouche. Utilisee uniquement a de petites tailles (24-40px,
// header/footer/modale) : sa resolution native (91x78px) reste nette en dessous de ce
// seuil, seul un agrandissement au-dela poserait probleme (voir favicon-litchi.jpg).
export default function LogoMark({ size = 36 }) {
  return (
    <img
      src="/favicon-litchi.jpg"
      alt="TransQi"
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: '50%', objectFit: 'cover' }}
    />
  );
}
