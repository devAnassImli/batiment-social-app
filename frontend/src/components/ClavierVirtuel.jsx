import { useState } from 'react';
import './ClavierVirtuel.css';

const LIGNES_CHIFFRES = ['1','2','3','4','5','6','7','8','9','0'];
const LIGNES_LETTRES = [
  ['a','z','e','r','t','y','u','i','o','p'],
  ['q','s','d','f','g','h','j','k','l','m'],
  ['w','x','c','v','b','n',',','.','?'],
];
const ACCENTS = ['é','è','à','ç','ù','ê','î','ô','â','û','ï','ë'];

export default function ClavierVirtuel({ valeurInitiale, onValider, onFermer, obligatoire }) {
  const [texte, setTexte] = useState(valeurInitiale || '');
  const [majuscule, setMajuscule] = useState(false);

  const ajouter = (c) => {
    const estLettre = /[a-zàâäéèêëïîôöùûüç]/i.test(c);
    setTexte((t) => t + (estLettre && majuscule ? c.toUpperCase() : c));
  };
  const espace = () => setTexte((t) => t + ' ');
  const effacer = () => setTexte((t) => t.slice(0, -1));

  return (
    <div className="clavier-fond" onClick={onFermer}>
      <div className="clavier-boite" onClick={(e) => e.stopPropagation()}>
        <textarea className="clavier-affichage" value={texte} readOnly rows={2} />

        <div className="clavier-touches">
          <div className="clavier-ligne">
            {LIGNES_CHIFFRES.map((c) => (
              <button key={c} onClick={() => ajouter(c)}>{c}</button>
            ))}
          </div>

          {LIGNES_LETTRES.map((ligne, i) => (
            <div key={i} className="clavier-ligne">
              {i === 1 && (
                <button
                  className={`clavier-maj ${majuscule ? 'clavier-maj-actif' : ''}`}
                  onClick={() => setMajuscule((m) => !m)}
                >
                  ⇧
                </button>
              )}
              {ligne.map((c) => (
                <button key={c} onClick={() => ajouter(c)}>
                  {/[a-z]/i.test(c) && majuscule ? c.toUpperCase() : c}
                </button>
              ))}
            </div>
          ))}

          <div className="clavier-ligne clavier-ligne-accents">
            {ACCENTS.map((c) => (
              <button key={c} onClick={() => ajouter(c)}>{c}</button>
            ))}
          </div>
        </div>

        <div className="clavier-actions">
          <button className="clavier-espace" onClick={espace}>Espace</button>
          <button className="clavier-effacer" onClick={effacer}>⌫ Effacer un caractère</button>
        </div>
        <div className="clavier-actions">
          <button className="clavier-annuler" onClick={onFermer}>← Retour (annuler)</button>
          <button
            className="clavier-valider"
            disabled={obligatoire && texte.trim().length === 0}
            onClick={() => onValider(texte)}
          >
            ✓ Valider
          </button>
        </div>
      </div>
    </div>
  );
}