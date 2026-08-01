# Plan de design

> **Mise à jour 7 — chaque infobulle nomme son jeu de données.**
> Un chiffre sans sa source est une affirmation. Les 28 cibles interactives
> — 6 tuiles KPI, 22 marques dans les figures — portent désormais un pied
> d'infobulle indiquant le ou les classeurs dont la valeur est tirée.
>
> | mesure | provenance |
> |---|---|
> | part de la VA, couverture du PIB | `Comptes Nationaux.xlsx` |
> | part du crédit, maturité, ventilation | `Crédit bancaire.xlsx` |
> | agences et institutions | `FINAN.xlsx` |
> | **IFR, écart, réallocation** | **les deux premiers** — l'indice est un rapport entre eux, le taire serait mentir par omission |
>
> **Aucun nom de fichier n'est écrit dans le code d'affichage.** Les libellés
> viennent de `DATA.meta.sources`, que le pipeline produit déjà : si une source
> change dans les classeurs, les infobulles suivent sans qu'on y touche. Chaque
> module de scène déclare `var SRC = window.DATA.meta.sources;` et rien d'autre.
>
> Le libellé a la forme `Fichier.xlsx — précision` ; l'infobulle le scinde et
> pose le fichier en mono sur l'encre, la précision en dessous en `--brume`,
> sous un filet. C'est une caution, pas une donnée de plus à lire — d'où le
> corps réduit et le retrait de contraste.
>
> Contrôle : les 24 scénarios × 2 thèmes, **672 infobulles ouvertes**, chacune
> devant nommer au moins une source, et une source figurant réellement dans
> `DATA.meta.sources`.

> **Mise à jour 6 — les chiffres montent, les figures se dessinent.**
> Cinq primitives dans `lib.js` (`A.anim`), une seule règle : **l'animation
> décore, elle ne porte jamais d'information.** Sous `prefers-reduced-motion`
> tout se pose d'emblée à sa valeur finale, et l'image d'arrivée est toujours
> complète — couper le mouvement ne fait perdre aucune donnée.
>
> | primitive | ce qu'elle fait | employée par |
> |---|---|---|
> | `nombre` | compteur, avec sortie cubique | les 6 tuiles KPI |
> | `tracer` | le trait se dessine (`stroke-dashoffset`) | Lorenz, 3 courbes d'agences |
> | `volet` | rectangle de découpe qui s'ouvre | aires de maturité |
> | `progresser` | boucle d'images, pour ce que le CSS ne transitionne pas | balayage des anneaux |
> | `auRegard` | déclenche à l'entrée dans le champ, une fois | les 7 figures |
>
> **Les compteurs ne repartent pas de zéro à chaque bascule.** Chaque tuile
> retient sa valeur numérique : au premier affichage elle monte depuis 0 en
> 1 000 ms, à un changement de filtre elle rejoint la nouvelle valeur depuis
> l'ancienne en 420 ms. Repartir de zéro donnerait un clignotement, pas une
> lecture.
>
> **Les entrées sont déclenchées au défilement, pas au chargement.** Jouer les
> sept figures d'emblée gaspillerait cinq animations que personne ne voit, et
> le lecteur qui descend trouverait des graphiques déjà posés. Un
> `IntersectionObserver` par carte, seuil 0,2, une seule fois. Sans
> `IntersectionObserver`, tout se joue immédiatement : mieux vaut une entrée
> manquée qu'une figure qui n'apparaît jamais.
>
> **Trois pièges rencontrés, pour mémoire :**
> - Sur les barres d'écart, `.mark` doit être **reposée avant** `update()` :
>   celui-ci écrit la hauteur puis réécrit la classe, si bien que sans elle la
>   barre sautait à sa valeur et la classe arrivait trop tard pour animer.
> - `tracer` doit **rendre son pointillé d'origine** à la fin, sinon les séries
>   tiretée et pointillée des agences resteraient pleines pour toujours.
> - Le `volet` doit **retirer sa découpe** une fois ouvert, sinon les étiquettes
>   de bout de série restent rognées.
>
> Le contrôle des 24 scénarios est rejoué **mouvement activé**, avec attente de
> stabilisation : il vérifie la valeur d'arrivée de chaque KPI, l'absence de
> découpe oubliée et l'absence de décalage d'entrée figé sur les barres.

> **Mise à jour 4 — une seule couleur, réservée à l'écran 1.**
> Le monochrome intégral était juste sur le fond mais coûteux au premier regard :
> un jury de hackathon scanne une page en cinq secondes, et sept cartes de même
> poids visuel ne disent pas laquelle porte l'idée neuve. L'écran 1 — le graphique
> de flottaison, seul encodage vraiment original du lot — reçoit donc un accent
> unique : **`--accent` `#CD2A3E` en clair, `#F2685C` en sombre**, le rouge du
> drapeau mauritanien. 5,3:1 et 5,8:1 sur leurs cartes respectives.
>
> **Où l'accent se pose, et pourquoi pas ailleurs.** Il aurait été tentant de
> colorer les barres en déficit. C'eût été une faute : l'écart est *la même
> donnée* à l'écran 1 et à l'écran 2, et il se serait retrouvé rouge ici, noir
> là. L'accent marque donc ce qui **n'existe que sur l'écran 1** — la ligne de
> parité et la zone hachurée du crédit manquant. Il a un sens propre, exclusif,
> et ne peut rien contredire ailleurs :
>
> - `.ligne-parite` — 1,5 px `--emerge` → **2 px `--accent`**
> - les deux étiquettes « parité » — `f-emerge` → `f-accent`
> - la hachure du manque — `s-immerge` à 0,5 → **`s-accent` à 0,85**
>
> **Une seule entorse au confinement, et elle est justifiée.** La tuile KPI
> « 6,7 Md manquent aux industries » chiffre *exactement* la zone hachurée.
> Même quantité, même couleur : la laisser en noir aurait coupé le chiffre-titre
> du graphique qui l'illustre, alors que la bande KPI est la première chose
> scannée. Elle reçoit donc le lavis, le chiffre et l'icône en accent — mesurés
> à 4,65:1 (chiffre sur sa tuile) et 3,48:1 (icône sur sa pastille) en clair,
> 5,13:1 et 3,93:1 en sombre.
>
> Le contrôle des 24 scénarios vérifie qu'aucune marque accentuée ne sort de ces
> **deux** zones : le confinement est une propriété testée, pas une intention.
> Tout le reste — écarts, Lorenz, maturité, agences, anneaux, cinq tuiles sur six
> — demeure strictement noir et blanc.

> **Mise à jour 5 — les six tuiles KPI deviennent interrogeables.**
> Un chiffre-titre sans son dénominateur est une affirmation, pas une donnée.
> Chaque tuile ouvre désormais le détail de ce qu'elle avance — d'où vient le
> nombre et à quoi il se compare — au survol, au toucher et au focus clavier,
> via l'infobulle déjà en place pour les graphiques.
>
> | tuile | ce que l'infobulle ajoute |
> |---|---|
> | indice max / min | part de la VA, part du crédit, IFR, écart du secteur |
> | crédit manquant | montant en MRU M (pastille accent), parts, IFR |
> | réallocation | somme des excédents, encours ventilé, part à déplacer |
> | court terme | part en déc. 2020, variation du CT et du MLT sur 15 mois |
> | PIB non couvert | montant, part agro-pastorale, PIB au coût des facteurs |
>
> Trois décisions de mise en œuvre :
> - **`tabindex` posé en JavaScript, pas dans le HTML.** Sans JS il n'y aurait
>   rien à montrer, et six étapes de tabulation vides seraient une nuisance.
> - **Un `click` en plus du survol.** Au doigt, `pointerleave` se déclenche dès
>   que le contact cesse : un tap ne laissait qu'un éclair. Le clic rouvre la
>   bulle et l'y laisse ; un appui hors des tuiles la referme.
> - **Le relief au survol est neutralisé sous `prefers-reduced-motion`.**
>
> L'infobulle enrichit, elle ne conditionne rien : la tuile reste entièrement
> lisible sans elle, et tous ces chiffres figurent déjà dans l'annexe.

> **Mise à jour 3 — la palette descend de la marque : une rampe d'encre, sans teinte.**
> Le logo Open Community est un noir plein sur blanc. Les données le suivent :
> plus de doré ni de sarcelle, cinq degrés d'encre et leurs dérivés blancs.
>
> Ce que la bascule change de fond en comble : **la teinte ne code plus rien, la
> clarté code tout.** Deux conséquences à assumer plutôt qu'à subir.
>
> 1. *Gain.* Une palette achromatique est sûre pour tous les daltonismes **par
>    construction** — il ne reste aucune teinte à confondre. Les contrôles ΔE des
>    passes précédentes deviennent sans objet.
> 2. *Coût.* La clarté doit alors porter seule ce que la teinte portait avant. Le
>    contrôle a donc changé de nature : à côté du contraste WCAG, on mesure le
>    **ΔL\* entre marques qui se côtoient dans une même figure**, avec un plancher
>    de 10. `node scripts/palette.js` rejoue les deux.
>
> Les deux pôles ne s'opposent plus par la nuance — deux gris moyens donnaient une
> image délavée — mais par la **densité** : le déficit est un **noir plein `#000000`**,
> le surfinancement un **aplat pâle cerclé de ce même noir**. Un seul encrier, deux
> façons de le poser. En sombre, la même logique retournée : blanc plein contre
> aplat sombre cerclé de blanc.
>
> | jeton | rôle | clair | sombre |
> |---|---|---|---|
> | `--immerge` | sous-financé — aplat plein, filets, hachures | 21,0:1 · L\* 0 | 17,7:1 · L\* 100 |
> | `--sable` | encre, série dominante | 18,3:1 · L\* 6,8 | 15,4:1 · L\* 94,6 |
> | `--absent` | angles morts, toujours hachurés | 13,0:1 · L\* 20,3 | 11,6:1 · L\* 84,1 |
> | `--emerge` | surfinancé — **encre** (jamais un aplat) | 9,7:1 · L\* 29,0 | 9,8:1 · L\* 77,9 |
> | `--brume` | texte secondaire, 3ᵉ série | 5,6:1 · L\* 44,0 | 6,3:1 · L\* 63,7 |
> | `--connu` | part couverte, celle qui doit s'effacer | 3,2:1 · L\* 59,9 | 3,3:1 · L\* 44,9 |
> | `--aplat` | surfinancé — **remplissage cerclé** | 1,4:1 · L\* 86,8 | 1,6:1 · L\* 24,3 |
>
> `--aplat` est la seule valeur qui ne tient pas 3:1 sur la carte, et c'est assumé :
> **ce n'est pas son ton qui rend la marque visible, c'est son filet en `--immerge`**
> (21:1). D'où une règle que le contrôle vérifie à chaque scénario — *tout
> remplissage en `--aplat` porte un contour en `--immerge`* — et un jeton scindé en
> deux, parce que `--emerge` servait à la fois d'aplat et de texte : l'aplat est
> devenu `--aplat`, l'encre est restée `--emerge`.
>
> Écarts entre marques voisines : aplat/immergé **86,8** (clair) et **75,7** (sombre) ·
> connu/absent **39,6** / **39,1** · les trois séries « agences » **13,4** et **23,8** /
> **10,5** et **20,3**.
>
> Quatre endroits où la teinte faisait un travail qu'il a fallu redonner à autre chose :
> - **Agences** — trois traits de 2 px ne se distinguaient plus par la seule clarté,
>   surtout en sombre où trois gris clairs se ressemblent. Le tracé devient le second
>   encodage : plein, tireté, pointillé. La microfinance passe de `--immerge` à
>   `--brume`, `--immerge` étant désormais réservé au pôle « déficit ».
> - **Légende des anneaux** — la pastille montrait un aplat là où la couronne montre
>   une hachure. En monochrome c'est la hachure qui porte l'identité : la pastille
>   la reprend (lavis à 30 %, hachure à 45°, filet plein).
> - **Branches orphelines de l'annexe** — `--absent` est maintenant une encre presque
>   pleine, indiscernable du texte courant. L'italique reprend le relais.
> - **Icônes des tuiles KPI** — elles prenaient la teinte de leur tuile ; `--connu` ne
>   tient que 2,2:1 sur son propre lavis à 26 %. L'icône passe en encre, la teinte
>   reste sur le fond.
>
> Le lavis des tuiles KPI descend de 18 % à **8 % en clair** : avec `--immerge` au noir
> plein, même 10 % faisait retomber `--brume` à 4,46:1 sur la tuile « indice min ». À
> 8 % elle tient 4,67:1, et c'est le filet à 26 % qui donne sa forme à la tuile.
>
> **Corrigé au passage** — le chiffre central des anneaux était écrit
> `font-size="28"` en **attribut de présentation**, que la règle CSS `.val { font-size: 12px }`
> écrase systématiquement. Le nombre censé être la figure se rendait donc à la taille
> d'une étiquette, et sa légende débordait du trou (125 unités de large pour une corde
> de 122). Passé en `style`, il s'applique enfin.

> **Mise à jour 2 — habillage repris d'un modèle fourni (barre de nav blanche
> arrondie, tuiles KPI teintées, cartes blanches sur fond lavande).**
> La marque est **Open Community** — logo réel (`img/openmr-logo.png`, encre noire
> sur fond transparent, inversée en thème sombre) posé nu, sans jeton de couleur
> derrière lui. Les rubriques de navigation du modèle sont remplacées
> par les trois filtres (année, extraction, résidu), en `<select>` natifs.
>
> Ce que la reprise a imposé de revalider : les graphiques vivent désormais sur une
> **carte**, pas sur le fond de page, donc la surface de référence a changé.
> - Carte claire `#FFFFFF` : toutes les marques passent (connu 3,7:1 · émergé 4,6:1
>   · immergé 4,6:1 · absent 8,1:1 · brume 6,1:1 · encre 16,4:1).
> - Carte sombre : `#123946` faisait tomber `--absent` à **2,97:1**. Remontée à
>   **`#0F2A36`** → absent 3,6:1, et tout le reste s'améliore.
> - `.f-fond` / `.s-fond` (respiration entre aires empilées, libellés à l'intérieur
>   des barres) pointent maintenant sur `--carte` et non plus sur le fond de page.
> - Tuiles KPI : la couleur pleine sur son propre lavis ne tenait que **3,99:1**.
>   Le chiffre est donc en encre et la teinte reste sur la tuile. Le lavis vaut
>   18 % en clair mais **10 % en sombre**, où l'étiquette tombait à 3,85:1 à 18 %.
> - Chaque tuile porte une icône de direction (flèche haut / bas / barre) : le sens
>   n'est plus porté par la seule couleur.

> **Mise à jour 1 — le livrable est un tableau de bord, plus un récit scrollé.**
> Bandeau de 6 KPI, grille de 7 cartes, une phrase chiffrée par carte, annexe repliée.
> Les deux passes ci-dessous restent la source du système visuel (palette, typographie,
> élément signature) ; seule la mise en page a changé. Ce qui a été conservé du brief
> malgré la bascule vers le format « Power BI » : pas d'icône dans un cercle coloré sur
> les KPI, et des cartes à filet plutôt qu'à aplat — un fond de carte ferait tomber
> `--absent` à 2,97:1 en thème sombre et invaliderait les contrastes mesurés plus bas.

---

## Les deux passes d'origine

## Passe 1 — la proposition

**Palette** (validée, voir plus bas) : abysse / profond / sable / brume / émergé / immergé / absent.

**Trois rôles typographiques**
- Display — `Fraunces` variable, `opsz` 96–120, `WONK 1`, `SOFT 20`. Titres d'écran seulement.
- Corps — `Inter Tight` 400/500.
- Chiffres — `IBM Plex Mono` 400/500, `tabular-nums`. Tout nombre affiché.

**Layout**

```
┌──────────────────────────────────────────────┐
│  titre de couverture (Fraunces, grand)       │
│  ────────── la ligne de flottaison ───────── │  ← trait qui traverse la page
│  sous-titre                                  │
├──────────────────────────────────────────────┤
│  phrase de paramètres (sticky)               │
├──────────────────────────────────────────────┤
│  ÉCRAN 1   graphique de flottaison           │
│  ÉCRAN 2   waterfall + Lorenz                │
│  ÉCRAN 3   aire CT/MLT + agences             │
│  ÉCRAN 4   couverture + table + limites      │
└──────────────────────────────────────────────┘
```

**Élément signature** — le graphique de flottaison : cinq colonnes, une ligne de parité.

---

## Passe 2 — la critique

Question posée à chaque élément : *est-ce que je produirais la même chose pour un
dashboard sur la logistique au Vietnam ?*

**1. Fond marine sombre + accents or/turquoise → OUI, je le referais tel quel. Défaut.**
Un dark dashboard « premium » est le réflexe par défaut. Ce qui doit le sauver n'est pas
la couleur mais la **géométrie** : la ligne de flottaison ne peut pas être un simple axe
à l'intérieur d'un graphique, sinon c'est une reference line comme partout ailleurs.
→ *Révision :* la ligne devient un objet de **niveau page**. Elle se trace sous le titre de
couverture, réapparaît à la même hauteur relative dans chaque écran, et les colonnes de
l'écran 1 la **traversent physiquement**. C'est le seul élément qui persiste d'un écran à l'autre.

**2. Le graphique de flottaison tel que décrit dans le brief → encodage ambigu. Défaut.**
« Hauteur = poids VA, remplissage = part du crédit » : deux quantités dans un même rectangle,
illisible à 2 mètres, et la position par rapport à la ligne ne veut plus rien dire.
→ *Révision :* **barres à largeur variable.**
- **largeur** = part de la VA (le poids économique),
- **hauteur** = IFR, la ligne de parité à IFR = 1,
- donc **aire = part du crédit**, et l'aire entre le sommet de la barre et la ligne est
  *exactement* proportionnelle à l'écart en MRU M.

C'est vérifiable : aire ∝ largeur × hauteur ∝ part_va × (part_crédit / part_va) = part_crédit.
L'encodage n'est donc pas décoratif, il **découle d'une identité arithmétique du jeu de données**.
Ce n'est pas ce que je dessinerais pour la logistique vietnamienne : ça vient de ces chiffres-ci.
Trié par IFR décroissant, le profil dessine une côte qui plonge sous la ligne — la métaphore
et la donnée disent la même chose.

**3. Barre de contrôles collante avec trois toggles → OUI, générique. Défaut.**
→ *Révision :* les paramètres s'écrivent comme **une phrase** :
« Lecture en *2017*, extraction *incluse*, résidu *exclu*. » Les trois termes en italique sont
cliquables. On lit une hypothèse, pas un panneau de réglages.

**4. Waterfall et Lorenz côte à côte en grille 2 colonnes → OUI, générique. Défaut.**
→ *Révision :* le graphique des écarts occupe toute la largeur et la Lorenz est un petit
encart de 268 px posé dans la bande réservée à droite. La grille disparaît.

**4 bis. Le waterfall lui-même était un défaut — repéré à l'usage, pas à la relecture.**
Dans une cascade, la barre encode sa valeur par sa **longueur** mais sa position verticale
par le **cumul** des précédentes. Résultat : la Pêche (+3 193) s'affichait plus haut que le
BTP (+5 767) tout en valant moins. Deux grandeurs sur un même axe, et l'œil lit la mauvaise.
→ *Révision :* barres divergentes, **une seule ligne de base**, échelle **symétrique** —
la forme que `choosing-a-form.md` prescrit pour un écart à une référence, et la règle de
`marks-and-anatomy.md` selon laquelle une barre « croît depuis une seule ligne de base ».
La somme nulle passe de la géométrie au texte : deux totaux chiffrés sous le graphique.
Les mettre en barres aurait écrasé l'échelle (le cumul vaut 1,5 fois le plus grand écart).

**5. Trois grands chiffres en bandeau → conservé**, mais sans carte, sans bordure, sans icône :
le brief l'exige déjà et c'est le bon choix.

### Ce qui a changé
La ligne de flottaison passe du statut de décor à celui d'ossature ; le graphique signature
change d'encodage pour que sa géométrie porte l'arithmétique ; les contrôles deviennent une
phrase ; la grille à deux colonnes est supprimée.

---

## Contrôles couleur (exécutés, non estimés)

> **Ces deux tableaux décrivent la palette colorée d'origine, remplacée depuis
> par la rampe monochrome de la marque (voir « Mise à jour 3 » en tête et
> `node scripts/palette.js`). Ils sont conservés parce qu'ils expliquent
> pourquoi certains jetons existent — `--connu` en particulier.**

`scripts/validate_palette.js` de la skill `dataviz`. **Le thème clair n'est pas une
inversion du sombre** : ses valeurs ont été re-dérivées et re-validées contre sa
propre surface, comme l'exige la skill.

### Thème clair — surface `#EDF2F4`

| Paire testée | Écrans | Résultat |
|---|---|---|
| `--emerge #9C6B0B` + `--immerge #1A8095` | 1, 2, 3 | PASS — ΔE 16,1 protan · 19,5 normal |
| `--connu #6F8894` + `--absent #6E4069` | 4 | PASS — ΔE 12,8 deutan · 16,6 normal |
| `--sable` + `--absent` + `--immerge` | 3 (agences) | PASS — ΔE 11,0 deutan · 18,9 normal |

Texte : encre `#0C222C` 14,5:1 · `--brume #4A6672` 5,4:1 sur le fond et 4,9:1 sur carte.
Marques : émergé 4,1:1 · immergé 4,1:1 · absent 7,2:1 · connu 3,3:1.

Le fond est un bleu-gris pâle, **pas un crème**. Crème + serif contrasté est précisément
le tic d'interface listé dans les interdits du brief ; avec Fraunces en titrage, un fond
crème aurait produit exactement la page qu'on cherche à éviter. Le bleu pâle garde en
prime la lecture maritime : le clair est la surface éclairée, le sombre l'abysse.

### Thème sombre — surface `#0B1D26`

| Paire testée | Écrans | Résultat |
|---|---|---|
| `--emerge` + `--immerge` | 1, 2, 3 | PASS — ΔE 20,0 protan · 25,7 tritan |
| `--connu` + `--absent` | 4 | PASS — ΔE 32,0 deutan |

**Correction apportée au brief :** `--absent #6B5B7B` ne tient que **2,80:1** sur `--abysse`,
sous le seuil de 3:1 pour une marque. Remplacé par **`#9A6E96`** (4,14:1). Il se pose sur
`--abysse`, pas sur `--profond` (2,97:1 seulement).

`--connu` est un token ajouté au brief : l'écran 4 se servait de `--sable` — un token de
**texte** — comme couleur de **remplissage**. Cela tenait en sombre par accident et
s'effondrait en clair, où `--sable` devient une encre presque noire. Une couleur de
remplissage a désormais son propre token dans les deux thèmes.

`--emerge` / `--immerge` en CT / MLT à l'écran 3 n'est pas une réutilisation décorative :
le court terme est ce qui flotte en surface, le long terme ce qui travaille en profondeur.
C'est le même axe sémantique.

---

## Bascule de thème sans redessin

Toutes les couleurs de marque passent par des **classes CSS** (`.f-emerge`, `.s-absent`…),
jamais par un attribut `fill` figé. Conséquence : changer de thème ne fait que réévaluer
des variables, aucun graphique n'est reconstruit et aucun état d'interaction n'est perdu.

Le thème est posé par un script en `<head>`, avant le premier rendu, sinon la page
clignote en clair avant de basculer chez qui a choisi le sombre.

---

## Couche d'interaction

Le brief disait « pas de tooltip, personne ne survole sur un projecteur ». C'est vrai
d'une projection, faux d'une page qu'on explore. La règle retenue concilie les deux :
**l'infobulle enrichit, elle ne conditionne jamais.** Tout ce qu'elle affiche reste
lisible sans elle — étiquettes directes sur chaque marque, et table « voir les chiffres ».

- Sur les barres, secteurs et points, **la marque est la cible** : chacune porte son
  infobulle et se souligne d'un liseré au survol. La zone de saisie est plus large que
  la marque (colonne entière, point de 2,6 px doté d'une cible de 12 px).
- Sur les deux séries temporelles, **un viseur trouve l'abscisse** : un trait vertical
  s'accroche au mois ou à l'année le plus proche et l'infobulle liste *toutes* les séries
  à cette date. On vise une date, jamais un trait de 2 px.
- **Mêmes informations au clavier qu'à la souris** : chaque cible est focalisable et porte
  un `aria-label` complet ; sur les viseurs, les flèches gauche/droite parcourent la série.
- Dans l'infobulle, **la valeur mène et l'étiquette suit** — le lecteur a déjà la série,
  il veut le nombre. Les séries sont repérées par un trait court, pas par un pavé de couleur.
- Les libellés sont insérés en `textContent`, jamais par concaténation de `innerHTML`.

---

## Écran 4 : pourquoi des anneaux et non des camemberts

Demande : passer les barres en secteurs circulaires. Deux réserves documentées dans
`anti-patterns.md`, et la façon dont elles sont levées :

1. **« Un camembert à deux parts » est un anti-patron** — la réponse recommandée est une
   tuile chiffrée : *le nombre est le graphique*. L'anneau de l'encours n'a que deux parts
   (59 / 41). Il porte donc **41 % en grand au centre** : c'est la tuile chiffrée, et la
   couronne ne fait que situer ce nombre dans son tout.
2. **« Un camembert pour comparer des valeurs proches » est un anti-patron** — l'anneau du
   PIB a deux parts presque égales (15,5 et 15,9 %). Elles ne sont pas censées être
   comparées entre elles : ce sont deux subdivisions d'un même ensemble « non couvert »
   (31,4 %). Elles partagent donc la même teinte, sont adjacentes, et se distinguent par
   l'intensité — l'agro-pastoral, qui porte le titre de l'écran, est le plus appuyé.

Les deux anneaux gardent des dénominateurs séparés, et chacun somme à 100 % du sien.

**Étiquetage direct de toutes les parts.** Première version : seule la part mise en avant
apparaissait, au centre ; les autres n'existaient que dans la légende, sous la figure. Une
figure dont il faut sortir pour savoir ce qu'on regarde est une figure incomplète.
Chaque part porte désormais son nom court et son pourcentage **sur la couronne extérieure**,
posés sur le fond de page — la lisibilité ne dépend alors ni de l'aplat ni des hachures, et
tient dans les deux thèmes sans calcul de contraste par secteur.

**Le centre agrège, la couronne décompose.** Une fois toutes les parts étiquetées, répéter
au centre une part déjà nommée juste à côté n'apprenait plus rien. Le centre porte donc ce
que l'anneau ne dit pas : pour le PIB, le **total** non couvert (31,4 %) que la couronne ne
montre que scindé en deux ; pour l'encours, le **montant** (30 810 MRU M) dont la couronne
ne donne que le pourcentage. Aucune redondance, et la tuile chiffrée reste en place.
