# Le crédit suit-il l'économie ?

Tableau de bord sur l'**accès au financement et l'inclusion financière en Mauritanie**.
Réalisé pour le hackathon *De la donnée au storytelling* (Open Community).

**→ [Voir le tableau de bord](https://sidimohamed31.github.io/acces-financement-mauritanie/)**

---

## La question

Le crédit bancaire mauritanien se distribue-t-il comme l'économie qu'il finance ?

Pour y répondre, chaque secteur reçoit un **indice de financement relatif (IFR)** :

```
IFR = part du secteur dans le crédit / part du secteur dans la valeur ajoutée
```

À 1, le crédit épouse exactement le poids économique. Au-dessus, le secteur reçoit
plus que son poids ; en dessous, moins.

En 2017, le BTP capte **2,53 fois** sa part de crédit quand les industries n'en
obtiennent que **0,48**. Il faudrait déplacer **22,9 %** de l'encours ventilé —
10 142 millions MRU — pour que le crédit suive l'économie.

## Ce que la figure principale encode

Le graphique de flottaison n'est pas un histogramme habillé. La géométrie y porte
l'arithmétique :

| dimension | grandeur |
|---|---|
| largeur de la colonne | part du secteur dans la valeur ajoutée |
| hauteur de la colonne | indice de financement relatif |
| **aire** de la colonne | **part du secteur dans le crédit** |
| aire hachurée jusqu'à la parité | **écart en millions de MRU** |

`aire = part_va × (part_crédit / part_va) = part_crédit`. La surface manquante est
donc littéralement le crédit qui manque, à l'échelle.

## Reproductibilité

Aucun chiffre affiché n'a été saisi à la main.

```
pipeline/build_data.py     lit les trois classeurs, produit js/data.js
data/raw/                  les sources, telles que reçues
scripts/palette.js         rejoue les contrôles de contraste de la palette
```

Le pipeline lit les classeurs par **indices de lignes explicites** — jamais en
laissant pandas deviner une structure — et porte **142 assertions** de cohérence.
Les écarts sectoriels somment exactement à zéro, par construction et à l'affichage
(arrondi à somme nulle).

```bash
python pipeline/build_data.py     # régénère js/data.js et data/data.json
node scripts/palette.js           # revalide les contrastes WCAG et les écarts L*
```

## Limites, énoncées et non masquées

- **Deux dates.** Valeur ajoutée 2017, encours de crédit 2020 : on compare deux
  structures, pas deux flux datés du même moment.
- **Six postes contre vingt branches.** Sept branches de valeur ajoutée n'ont
  aucun poste de crédit correspondant — 31,4 % du PIB.
- **Un résidu de 41 %.** « Consommation et autres » n'est pas ventilé finement.
  Le filtre *Résidu 41 %* permet de l'exclure ou de le répartir au poids
  économique : **les écarts en MRU sont strictement invariants** à ce choix, ce
  qui est démontré dans l'annexe du tableau de bord.
- Les colonnes d'hypothèse saisies à la main dans les sources sont **exclues** de
  tout affichage.

## Mise en œuvre

Sans dépendance, sans étape de construction : SVG écrit à la main, JavaScript
vanille, polices et données embarquées. La page **fonctionne hors ligne**, ouverte
directement depuis le disque.

- palette monochrome dérivée du logo, avec **un seul accent** confiné à la figure
  principale et au chiffre qu'elle illustre ;
- contrastes WCAG et écarts de clarté L\* **mesurés**, pas estimés — voir
  [DESIGN.md](DESIGN.md) ;
- l'identité d'une marque ne repose jamais sur la seule couleur : étiquettes
  directes, hachures, tracés pleins/tiretés/pointillés ;
- animations d'entrée entièrement neutralisées sous `prefers-reduced-motion`,
  l'image d'arrivée restant complète.

## Documentation

- [PLAN_DASHBOARD.md](PLAN_DASHBOARD.md) — le plan, ses révisions et le journal
  des objections traitées
- [DESIGN.md](DESIGN.md) — le système visuel, les mesures de contraste et les
  arbitrages

## Sources

Comptes nationaux, statistiques de crédit bancaire et données d'inclusion
financière (`data/raw/`). Couverture : valeur ajoutée 2005–2017, encours de
crédit janvier 2020 – mars 2021.
