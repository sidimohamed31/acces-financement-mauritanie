/* Validation de la palette monochrome : contraste WCAG + écart de clarté L*.
   Une palette achromatique est par construction sûre pour les daltonismes :
   il n'y a plus de teinte à confondre. Ce qui reste à prouver, c'est que la
   clarté seule suffit — d'où le contrôle de ΔL* entre marques voisines. */

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lin = v => (v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const Y = h => { const [r, g, b] = hex(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (a, b) => { const x = Y(a), y = Y(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const Lstar = h => { const y = Y(h); return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y; };
const mix = (a, b, p) => '#' + hex(a).map((v, i) => Math.round(v * p + hex(b)[i] * (1 - p))
  .toString(16).padStart(2, '0')).join('');

const themes = {
  clair: {
    abysse: '#EBECEE', carte: '#FFFFFF', sable: '#101619', brume: '#5E6A70',
    trait: '#DCDFE1', absent: '#2B3235', immerge: '#000000', emerge: '#3C4649',
    aplat: '#D6DADC', connu: '#889296', accent: '#CD2A3E', lavis: 0.08
  },
  sombre: {
    abysse: '#0B0D0E', carte: '#16191B', sable: '#EDF0F1', brume: '#929CA1',
    trait: '#2A3033', absent: '#CBD3D7', immerge: '#FFFFFF', emerge: '#B9C2C6',
    aplat: '#333B3F', connu: '#626C70', accent: '#F2685C', lavis: 0.10
  }
};

// Rôle de chaque jeton -> seuil applicable.
// 4.5 : sert de texte courant quelque part (.lecture .up/.down/.void, étiquettes SVG)
// 3.0 : seulement de surface ou de filet
// null : --aplat est un remplissage qui ne se détache PAS par son ton mais par
//        son contour. C'est le contour qui est mesuré, pas lui.
const seuils = {
  sable: 4.5, brume: 4.5, emerge: 4.5, immerge: 4.5, absent: 4.5,
  connu: 3.0, accent: 4.5, aplat: null
};

// Marques qui se côtoient dans une même figure : la clarté doit les séparer.
const voisins = [
  ['aplat', 'immerge', 'flottaison / écarts / maturité'],
  ['connu', 'absent', 'anneaux'],
  ['sable', 'absent', 'agences'],
  ['sable', 'brume', 'agences'],
  ['absent', 'brume', 'agences']
];

let ko = 0;
for (const [nom, t] of Object.entries(themes)) {
  console.log('\n=== thème ' + nom + ' ===');
  console.log('-- contraste sur la carte ' + t.carte + ' --');
  for (const [k, seuil] of Object.entries(seuils)) {
    const r = ratio(t[k], t.carte);
    if (seuil === null) {
      // Le contour en --immerge est ce qui doit tenir 3:1, pas l'aplat.
      const rc = ratio(t.immerge, t.carte);
      const ok = rc >= 3;
      if (!ok) ko++;
      console.log(`  ${k.padEnd(8)} ${r.toFixed(2).padStart(6)}:1  (exempt — filet immergé ${rc.toFixed(1)}:1)  L*=${Lstar(t[k]).toFixed(1).padStart(5)}  ${ok ? 'ok' : '*** ECHEC ***'}`);
      continue;
    }
    const ok = r >= seuil;
    if (!ok) ko++;
    console.log(`  ${k.padEnd(8)} ${r.toFixed(2).padStart(6)}:1  (seuil ${seuil})  L*=${Lstar(t[k]).toFixed(1).padStart(5)}  ${ok ? 'ok' : '*** ECHEC ***'}`);
  }

  console.log('-- texte secondaire sur les autres surfaces --');
  const surfaces = { 'fond de page': t.abysse };
  for (const k of ['emerge', 'immerge', 'absent', 'connu', 'brume']) {
    surfaces['tuile ' + k] = mix(t[k], t.carte, t.lavis);
  }
  for (const [nomS, s] of Object.entries(surfaces)) {
    const r = ratio(t.brume, s);
    const ok = r >= 4.5;
    if (!ok) ko++;
    console.log(`  brume / ${nomS.padEnd(15)} ${s}  ${r.toFixed(2).padStart(6)}:1  ${ok ? 'ok' : '*** ECHEC ***'}`);
  }

  console.log('-- séparation des marques voisines (ΔL*, plancher 10) --');
  for (const [a, b, ou] of voisins) {
    const d = Math.abs(Lstar(t[a]) - Lstar(t[b]));
    const ok = d >= 10;
    if (!ok) ko++;
    console.log(`  ${(a + ' / ' + b).padEnd(20)} ΔL*=${d.toFixed(1).padStart(5)}  ${ou.padEnd(32)} ${ok ? 'ok' : '*** ECHEC ***'}`);
  }

  const rt = ratio(t.trait, t.carte);
  console.log(`-- filets : trait / carte ${rt.toFixed(2)}:1 (informatif, non normatif)`);
}

console.log('\n' + (ko ? ko + ' contrôle(s) en échec' : 'tous les contrôles passent'));
// le bilan final est imprimé plus bas, après le contrôle de la tuile accentuée

/* --------------------------------------------------------------------------
   Contrôle spécifique de la tuile KPI accentuée : elle est la seule à porter
   son chiffre et son icône dans la couleur d'accent, sur un lavis de cette
   même couleur. C'est le cas le plus tendu de la palette.                  */
console.log('\n=== tuile KPI « crédit manquant » ===');
let koTuile = 0;
for (const [nom, t] of Object.entries(themes)) {
  const fond  = mix(t.accent, t.carte, t.lavis);   // lavis de la tuile
  const puce  = mix(t.accent, t.carte, 0.26);      // fond de la pastille
  const c1 = ratio(t.accent, fond);   // le chiffre, gros texte -> seuil 3
  const c2 = ratio(t.accent, puce);   // l'icône, graphique     -> seuil 3
  const c3 = ratio(t.brume, fond);    // l'étiquette, petit texte -> seuil 4.5
  const ok = c1 >= 3 && c2 >= 3 && c3 >= 4.5;
  if (!ok) koTuile++;
  console.log(`  ${nom.padEnd(7)} chiffre/tuile ${c1.toFixed(2)}:1 · icône/pastille ${c2.toFixed(2)}:1 · étiquette/tuile ${c3.toFixed(2)}:1  ${ok ? 'ok' : '*** ECHEC ***'}`);
}
console.log(koTuile ? koTuile + ' échec(s) sur la tuile accentuée' : 'tuile accentuée : ok');
process.exit(ko + koTuile ? 1 : 0);
