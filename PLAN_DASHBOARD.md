# Dashboard — « Le crédit suit-il l'économie ? »

Plan d'exécution pour Claude Code. Hackathon *De la donnée au storytelling*.
Thème : accès au financement et inclusion financière. Cible : prix **Meilleurs visuels**.

> **État : réalisé.** Le dashboard est dans `dashboard/`. Les chiffres de la section 2
> ont tous été vérifiés contre les fichiers sources et sont reproduits par le pipeline
> (142 contrôles). Les points corrigés en cours de route sont marqués **[révisé]** et
> récapitulés en section 11.

---

## 0. Ce qu'on construit

Un dashboard web **d'une seule page**, scrollé, en français, projeté sur écran devant un jury.
Ce n'est pas un outil d'exploration : c'est une **démonstration en 4 temps** qui se lit en 3 minutes,
avec juste assez d'interaction pour que le jury puisse pousser une hypothèse et voir le graphique
répondre.

La thèse à défendre, dans cet ordre :

1. Le crédit bancaire mauritanien n'est **pas** réparti selon le poids économique des secteurs.
2. L'écart est chiffrable, en points et en millions de MRU.
3. Il est **structurel** : 64 % de l'encours est à court terme, donc le système finance le
   fonds de roulement, pas l'investissement.
4. Et il est **incomplet** : 41 % de l'encours n'est pas ventilé, et l'agro-pastoral (15,5 % du PIB)
   n'apparaît nulle part dans la ventilation sectorielle publiée.

Le point 4 est la chute. Ne pas le noyer.

---

## 1. Données sources

Les trois fichiers sont **à la racine du projet, avec des espaces dans les noms**
(pas dans `data/raw/`, pas d'underscores) — **[révisé]**. Ils sont copiés dans
`dashboard/data/raw/` par commodité ; le pipeline lit cette copie.

| Fichier | Contenu | Couverture |
|---|---|---|
| `Comptes Nationaux.xlsx` | VA par branche (**20 branches** — **[révisé]**, le plan disait 22), PIB marché et coût des facteurs | 2005–2017 |
| `Crédit bancaire.xlsx` | Bloc A (lignes 1–16) : encours CT / MLT mensuels. Bloc B (lignes 21–28) : ventilation sectorielle | 2020–2021 |
| `FINAN.xlsx` | Nombre d'institutions et d'agences par type | 2004–2019 |

Attention au parsing de `Crédit bancaire.xlsx` : **deux tables empilées dans la même feuille**,
séparées par 4 lignes vides. Lire les deux blocs séparément par index de ligne, ne pas laisser
pandas deviner. Le pipeline utilise openpyxl et des index explicites, ce qui règle le problème
à la racine.

**[révisé] — les colonnes D à F du bloc B ne sont pas des données.** Leur en-tête porte
« Hyp. % Court terme **(saisie)** » : c'est une hypothèse tapée à la main pour ventiler
CT / MLT par secteur. Elles ne sont **pas** exportées ni affichées — on ne met pas une
saisie arbitraire dans un concours de restitution de données. Le pipeline vérifie que
l'en-tête porte toujours la mention « saisie » et échoue si ce n'est plus le cas.

Autre écart de source : la colonne « Country wide » de `FINAN.xlsx` est erratique
(130, 232, 52, 42, 124, 52, 244…) et sans définition. Elle est ignorée.

Trois ruptures à assumer explicitement dans l'interface, pas à masquer :

- **Décalage temporel** : PIB 2017 vs crédit 2020. On compare deux *structures*, pas deux flux datés.
- **Résidu de 41 %** : « Consommation et autres », non ventilé finement.
- **Nomenclatures non alignées** : 6 postes de crédit vs 22 branches de VA.

---

## 2. Chiffres de référence (vérité terrain)

Ces valeurs ont été calculées et vérifiées. **Le pipeline doit les reproduire exactement.**
Si un chiffre diffère, c'est le pipeline qui a un bug, pas ce tableau.

### Table de correspondance

| Poste crédit | Branches VA agrégées |
|---|---|
| Commerce | Commerce |
| Pêche | Pêche |
| BTP | BTP |
| Industries | Extraction + Industries agroalimentaires + Autres industries manufacturières |
| Services | Transports + Restauration/hôtellerie + Information & communication + Activités financières + Immobilier + Activités spécialisées + Autres services |
| *(non couvert)* | Agriculture, Élevage, Sylviculture, Administration, Enseignement, Santé, Électricité/eau |

### Scénario A — base 2017, extraction incluse, résidu exclu

VA totale des 5 secteurs = **157 531** MRU M. Encours ventilé = **44 336,3** MRU M.

| Secteur | Part VA | Part crédit | IFR | Écart (MRU M) |
|---|---|---|---|---|
| BTP | 8,52 % | 21,53 % | **2,53** | +5 767 |
| Pêche | 11,61 % | 18,81 % | **1,62** | +3 193 |
| Commerce | 21,06 % | 23,73 % | **1,13** | +1 182 |
| Services | 29,83 % | 22,03 % | **0,74** | −3 458 |
| Industries | 28,97 % | 13,90 % | **0,48** | −6 684 |

`IFR = part_crédit / part_VA`. `Écart = encours_réel − (part_VA × encours_ventilé_total)`.
La somme des écarts vaut 0 par construction — c'est un contrôle à écrire dans le script.

### Scénario B — hors extraction

L'extraction (25 049 MRU M en 2017, soit 55 % de la VA « Industries ») est financée par IDE
et hors circuit bancaire local. La retirer change le classement :

| Secteur | Part VA | IFR | Écart (MRU M) |
|---|---|---|---|
| BTP | 10,13 % | **2,12** | +5 052 |
| Pêche | 13,81 % | **1,36** | +2 220 |
| Commerce | 25,04 % | **0,95** | −584 |
| Industries (manuf. seules) | 15,54 % | **0,89** | −730 |
| Services | 35,47 % | **0,62** | −5 959 |

Le `2,12` du BTP est juste, mais de justesse : la valeur exacte est 2,1249**8**. Un
arrondi à 4 décimales avant l'affichage la ferait basculer à 2,13. Le pipeline conserve
donc la pleine précision et n'arrondit qu'au moment de l'affichage.

Le sous-financement se **déplace des industries vers les services**. C'est le retournement qui
prouve que l'analyse est robuste et non un artefact d'agrégation. Le rendre visible, pas le cacher.

### Structure temporelle (bloc A)

- Part court terme, déc. 2020 : **63,7 %**
- MLT, janv. 2020 → mars 2021 : **+16,3 %**
- CT, janv. 2020 → mars 2021 : **−4,2 %**

Le MLT progresse pendant que le CT recule : mouvement lent vers le financement long, à signaler.

### Angles morts

- Agriculture + Élevage + Sylviculture 2017 = **35 513** MRU M, soit **15,5 %** du PIB au coût
  des facteurs — **absents de la ventilation du crédit**.
- Résidu « Consommation et autres » = **30 810** MRU M, soit **41 %** de l'encours total.

### Inclusion (FINAN)

- Agences bancaires : 23 (2004) → 291 (2019).
- Agences IMF : 2 → 16.
- Banques : 8 → 18.
- **Rupture de série** : coopératives 98 (2013) → 23 (2014). Ne pas lisser. L'annoter dans le
  graphique comme rupture de série, c'est un point d'honnêteté que les jurys remarquent.

---

## 3. Stack

**HTML + CSS + SVG écrit à la main, en une page statique.** Pas de framework, pas de
bundler, pas de Streamlit — **et [révisé] pas de D3 non plus.**

Raison du refus des outils clés en main : le prix visé est « meilleurs visuels ». Streamlit et
Power BI imposent leurs chromes et leurs graphiques par défaut — c'est précisément ce qui fait
qu'un dashboard ressemble à tous les autres.

Raison de l'abandon de D3 : avec ~30 points de données et quatre visuels entièrement sur mesure,
D3 n'apportait que ses échelles et ses transitions — une centaine de lignes d'aide, contre une
dépendance CDN de 280 Ko. Or le livrable est projeté devant un jury : **une coupure réseau ne
doit pas pouvoir casser la démo.** Le dashboard est donc entièrement hors ligne —

- polices Google **vendorisées en local** dans `fonts/` (190 Ko de woff2, latin uniquement) ;
- données **embarquées** dans `js/data.js`, donc pas de `fetch()` : la page s'ouvre par
  simple double-clic en `file://`, sans serveur.

`data/data.json` reste produit pour inspection, mais la page ne le lit pas.

```
dashboard/
├─ index.html
├─ DESIGN.md            # le plan de design en deux passes + les contrôles couleur
├─ css/
│  ├─ tokens.css        # variables uniquement
│  └─ main.css
├─ fonts/               # woff2 vendorisés + fonts.css
├─ js/
│  ├─ data.js           # données embarquées (généré)
│  ├─ lib.js            # fmt() et fabrique de SVG
│  ├─ scene-waterline.js
│  ├─ scene-gap.js      # waterfall + Lorenz
│  ├─ scene-flow.js     # maturité + agences
│  ├─ scene-blindspots.js
│  └─ main.js           # état des hypothèses, bascules, séquence d'entrée
├─ data/
│  ├─ raw/              # les 3 .xlsx
│  ├─ mapping_secteurs.csv
│  └─ data.json         # sortie du pipeline (inspection)
└─ pipeline/
   └─ build_data.py     # xlsx → data.json + js/data.js, avec assertions
```

`build_data.py` : openpyxl seul (index de ligne explicites), et **142 contrôles sur les
chiffres de la section 2**. Le pipeline échoue bruyamment s'il dérive.

Lancer : `py -3 pipeline/build_data.py`, puis ouvrir `index.html` — directement, ou via
`py -3 -m http.server` si l'on préfère.

---

## 4. Direction artistique

### Processus obligatoire avant de coder

Faire deux passes, comme demandé dans la skill `frontend-design` :

1. Écrire le plan de design (palette nommée, 3 rôles typographiques, concept de layout en
   wireframe ASCII, élément signature).
2. Le relire contre ce brief. Pour chaque élément, se demander : *est-ce que je produirais la même
   chose pour un dashboard sur la logistique au Vietnam ?* Si oui, c'est un défaut, pas un choix.
   Réviser et dire ce qui a changé.

Seulement ensuite, coder.

### Direction proposée : la ligne de flottaison

Le sujet, c'est un pays atlantique dont la pêche est surfinancée, le sous-sol financé hors banque,
et les terres agricoles invisibles. La métaphore de la **ligne de flottaison** porte cela :
ce qui émerge est surfinancé, ce qui est immergé est sous-financé, et la ligne, c'est IFR = 1.

Elle traverse tout le dashboard : c'est l'axe de référence, l'élément signature, et le fil narratif.

### Tokens couleur

```
--abysse    #0B1D26   fond
--profond   #123946   surfaces, cartes
--sable     #E9DFC9   texte principal
--brume     #8FA3AC   texte secondaire, grilles
--emerge    #F2C14E   surfinancé (au-delà de la ligne)
--immerge   #4FA8B8   sous-financé (en deçà)
--absent    #9A6E96   angles morts, données manquantes   [révisé]
```

Sept valeurs, pas plus. `--emerge` et `--immerge` ne servent **qu'à** encoder le sens de l'écart —
jamais en décoration.

**[révisé] — `--absent` est passé de `#6B5B7B` à `#9A6E96`.** Le validateur de la skill
`dataviz` le mesure à **2,80:1** sur `--abysse`, sous le plancher de 3:1 exigé pour une
marque : sur un projecteur, la zone hachurée devenait illisible. `#9A6E96` tient 4,14:1.

Deux contraintes en découlent, vérifiées et non négociables :

- `--absent` se pose sur `--abysse`, **pas** sur `--profond` (2,97:1 seulement) ;
- dans un même graphique, `--absent` et `--immerge` ne sont admis qu'avec étiquetage
  direct (ΔE 8,3 sous deutéranopie — au plancher). L'écran 4 les sépare complètement et
  associe `--absent` à `--sable` (ΔE 32,0). L'écran 3 les fait cohabiter, mais les trois
  courbes y sont nommées en bout de tracé.

Mesures retenues : `--emerge` / `--immerge` ΔE 20,0 protan et 25,7 tritan — la paire
divergente principale passe largement. Texte : `--sable` 13,0:1, `--brume` 6,6:1 sur
`--abysse` et 4,7:1 sur `--profond`.

Interdits explicites, ce sont les tells de l'IA générative :
crème #F4F1EA + serif contrasté + terracotta #D97757 ; noir + vert acide ; mise en page
« broadsheet » à filets fins et angles droits ; dégradés de fond ; glassmorphism ; cartes KPI
avec grand chiffre + petite étiquette + icône dans un cercle coloré.

### Typographie

Trois rôles, trois familles, via `fonts.googleapis.com` :

- **Display** — `Fraunces`, axe optique élevé, `wonk` activé. Titres d'écran uniquement, 2 ou 3
  tailles maximum. C'est la voix éditoriale.
- **Corps** — `Inter Tight`, 400/500. Paragraphes, légendes, libellés.
- **Chiffres** — `IBM Plex Mono`, chasse fixe, `font-variant-numeric: tabular-nums`. **Tout**
  nombre affiché passe par cette famille : les colonnes de chiffres s'alignent, et le contraste
  serif / mono devient la signature typographique.

Formats : espace fine insécable comme séparateur de milliers, virgule décimale, « MRU M » pour
millions d'ouguiyas. Écrire une fonction `fmt()` unique et l'utiliser partout.

### Élément signature

**Le graphique de flottaison** (écran 1). Cinq colonnes verticales, une par secteur.

**[révisé] — l'encodage a changé.** « Hauteur = poids VA, remplissage = part du crédit »
met deux quantités dans un même rectangle : illisible à deux mètres, et la position par
rapport à la ligne ne veut plus rien dire. Encodage retenu, **barres à largeur variable** :

- la **largeur** de la colonne = part du secteur dans la VA ;
- la **hauteur** = IFR, la ligne de parité étant à IFR = 1 ;
- donc l'**aire** = largeur × hauteur ∝ part_va × (part_crédit / part_va) = **part du crédit**,
  et l'aire entre le sommet de la colonne et la ligne est *exactement* proportionnelle à
  l'écart en MRU M.

La géométrie porte l'arithmétique : ce n'est pas une métaphore plaquée, c'est une identité
du jeu de données. Trié par IFR décroissant, le profil dessine une côte qui plonge sous la ligne.

- Ce qui dépasse au-delà est peint en `--emerge`, ce qui manque en deçà est **hachuré**
  en `--immerge` — le hachurage dit « crédit absent », pas « crédit reçu ».
- Le surplus / déficit en MRU M est écrit en mono à l'extrémité de chaque colonne.

Au chargement, la ligne de flottaison se trace de gauche à droite (600 ms), puis les colonnes se
remplissent depuis le bas, décalées de 80 ms. Une seule séquence orchestrée sur toute la page.
Aucune autre animation d'entrée ailleurs — c'est là qu'on dépense l'audace.

Si le résultat ne lit pas au premier coup d'œil à 2 mètres, revenir à des barres divergentes
centrées sur 1 et garder l'audace pour l'écran 2. Un visuel lisible bat un visuel ambitieux raté.

---

## 5. Les quatre écrans

### Écran 1 — Le constat

Titre : *« Le BTP reçoit 2,5 fois plus de crédit que son poids dans l'économie »*
Pas de titre générique type « Vue d'ensemble ».

- Le graphique de flottaison (signature).
- Trois chiffres en bandeau, en mono, sans carte ni bordure : `2,53` IFR maximum (BTP),
  `0,48` IFR minimum (Industries), `41 %` d'encours non ventilé.
- Une phrase de lecture sous le graphique, écrite comme une légende de journal, pas comme un
  paragraphe d'analyse.

### Écran 2 — L'écart, en millions

Titre : *« 6,7 milliards de MRU manquent aux industries »*

- **[révisé] — barres divergentes, pas une cascade.** Le plan prévoyait un waterfall. À
  l'écran, il **trompait** : dans une cascade, chaque barre flotte sur le cumul de la
  précédente, si bien que la Pêche (+3 193) apparaissait **plus haut** que le BTP (+5 767)
  tout en valant moins. La position y encode le cumul, la longueur encode la valeur, et
  l'œil lit la position. Une forme qui rend la comparaison principale plus difficile est
  disqualifiée, quelle que soit son élégance.

  Retenu : des barres divergentes autour de zéro, toutes issues d'**une seule ligne de
  base**, sur une échelle **symétrique** — +6 000 mesure exactement autant que −6 000.
  C'est la forme prescrite pour « écart au-dessus / en dessous d'une référence ».

  La somme nulle n'est plus portée par la géométrie mais par **deux totaux affichés sous
  le graphique** (excédents +10 142, déficits −10 142). Les tracer en barres aurait écrasé
  l'échelle des secteurs : le cumul vaut une fois et demie le plus grand écart individuel.
- **Courbe de Lorenz croisée** en encart : part de VA cumulée en abscisse, part de crédit cumulée
  en ordonnée, diagonale d'équirépartition en pointillés `--brume`. L'aire entre les deux courbes
  est remplie — c'est l'inégalité d'allocation, visible d'un coup.

### Écran 3 — Le financement est court

Titre : *« Le système finance le mois qui vient, pas la décennie »*

- Aire empilée CT / MLT sur les 15 mois, `--emerge` pour le CT, `--immerge` pour le MLT.
  Ordonner l'axe des temps correctement : **le fichier source est en ordre décroissant.**
- Deux annotations tracées à la main dans le SVG, pas des tooltips : « CT −4,2 % » et « MLT +16,3 % ».
- En dessous, en petit : évolution des agences bancaires vs IMF, 2004–2019, avec l'annotation de
  rupture de série sur les coopératives en 2014.

### Écran 4 — Ce que les données ne disent pas

Titre : *« 15,5 % du PIB n'apparaît nulle part »*

L'écran le plus important, et celui que les autres équipes n'auront pas.

- **[révisé] — deux barres, pas une.** Le plan initial découpait « le PIB » en trois zones
  dont le résidu de 41 %. Or ces 41 % sont une part de l'**encours**, pas du PIB : les mettre
  dans la même barre revient à additionner deux dénominateurs différents. Le dashboard affiche
  donc deux barres, chacune sommant à 100 % de sa propre grandeur —
  - le **PIB au coût des facteurs** (229 624 MRU M) : 68,6 % couvert par la nomenclature du
    crédit, 15,5 % agro-pastoral, 15,9 % administration / santé / enseignement / énergie ;
  - l'**encours bancaire** (75 146 MRU M) : 59 % ventilé, 41 % de résidu.

  Les zones non couvertes sont en `--absent` hachuré ; l'agro-pastoral, qui porte le titre de
  l'écran, est plus appuyé que le reste.

  **[révisé] — ce sont des anneaux, pas des barres.** Deux réserves connues sur le camembert
  ont dicté la forme retenue : un camembert à **deux parts** ne dit rien qu'un nombre ne dise
  mieux, et un camembert **compare mal des valeurs proches** (15,5 % contre 15,9 %). D'où :
  le chiffre clé est écrit **en grand au centre** de chaque anneau — c'est lui le graphique,
  la couronne le situe dans son tout — et les deux parts presque égales partagent la même
  teinte, puisqu'elles sont deux subdivisions d'un même « non couvert » et n'ont pas à être
  comparées l'une à l'autre. Chaque anneau porte une légende chiffrée.
- La table de correspondance, affichée en clair, avec les branches non appariées grisées.
- Les trois limites méthodologiques, en trois phrases courtes. Sans excuse ni jargon.

---

## 6. Interaction

Trois contrôles seulement. **[révisé]** — ils ne forment pas une barre d'outils mais **une
phrase** collée en haut au scroll : « Lecture en *2017*, extraction minière *incluse*, résidu
de 41 % *exclu*. » Les termes en italique sont cliquables. On lit une hypothèse, pas un panneau
de réglages.

1. **Extraction : incluse / exclue** → bascule scénario A ↔ B. Les colonnes de l'écran 1 se
   réordonnent avec une transition de 400 ms. C'est le moment le plus fort de la démo : le jury
   voit le classement se retourner en direct, le déficit passant des industries aux services.
2. **Résidu 41 % : exclu / réparti au poids économique** — **[révisé]**. Le plan disait
   « réparti au prorata ». Au prorata *du crédit*, la bascule ne fait **rien** : les parts sont
   inchangées par construction, donc l'IFR aussi. Répartir au prorata du **poids économique**
   est le vrai test de robustesse — c'est l'hypothèse la plus favorable possible au système
   bancaire. Résultat : `IFR → 0,59 × IFR + 0,41`, une compression vers 1 qui **conserve
   exactement le classement**, et surtout qui **laisse les écarts en MRU M inchangés**.
   Cette invariance est démontrable algébriquement et vérifiée sur les six combinaisons
   année × extraction. C'est l'argument de l'écran 2 : quelle que soit l'hypothèse sur les
   41 % non ventilés, le manque en millions est le même nombre.
3. **Année de référence PIB : 2015 / 2016 / 2017** — **[révisé] sur la formulation.** Le plan
   annonçait « l'IFR est stable ». C'est faux pour deux secteurs : le commerce passe de 0,96 à
   1,13 et la pêche de 2,20 à 1,62. Ce qui est stable, ce sont **les extrêmes** — le BTP reste
   entre 2,10 et 2,53, les industries entre 0,48 et 0,61, les services entre 0,66 et 0,74.
   L'affirmation défendable est donc : le sur-financement du BTP et le sous-financement des
   industries et des services ne dépendent pas de l'année choisie. Ne pas sur-vendre le reste.

Chaque bascule doit **transitionner**, jamais redessiner. Les positions de départ et d'arrivée
sont ce qui raconte l'histoire.

**[révisé] — les graphiques sont interactifs.** Le principe initial (« pas de tooltip, personne
ne survole sur un projecteur ») est conservé comme **contrainte**, pas comme interdiction :
l'infobulle enrichit, elle ne conditionne jamais. Tout ce qui compte reste écrit dans le
graphique, et la projection se lit sans jamais survoler.

- Barres, secteurs d'anneau et points de Lorenz : la marque est la cible, avec liseré au
  survol et zone de saisie plus large qu'elle.
- Aire CT/MLT et courbes d'agences : un viseur vertical s'accroche à la date la plus proche
  et l'infobulle liste **toutes** les séries à cette abscisse.
- Mêmes informations au clavier qu'à la souris : cibles focalisables, `aria-label` complets,
  flèches gauche/droite pour parcourir les séries temporelles.

---

## 7. Rédaction

- Titres d'écran = **une affirmation chiffrée**, jamais un intitulé de rubrique.
- Sentence case partout. Pas de majuscules décoratives, pas d'emoji.
- Les libellés nomment ce que le lecteur reconnaît : « crédit reçu », pas « encours ventilé
  pondéré ». Le vocabulaire technique va dans l'écran 4, une seule fois.
- Un état vide (secteur sans crédit identifié) dit ce qui manque et pourquoi, il n'affiche pas 0.

---

## 8. Plancher de qualité

À tenir sans le mentionner dans l'interface :

- Responsive jusqu'à 380 px : les colonnes de flottaison passent en barres horizontales
  (bascule à 640 px, disposition reconstruite, pas seulement remise à l'échelle). Les trois
  autres figures gardent leur composition et défilent dans leur propre conteneur ; le corps
  de page, lui, ne défile jamais horizontalement. Vérifié à 380 px : `scrollWidth == clientWidth`.
- Contraste ≥ 4,5:1 sur tout le texte. Vérifier `--brume` sur `--abysse`.
- Focus clavier visible sur les trois contrôles.
- `@media (prefers-reduced-motion: reduce)` : la séquence d'entrée devient un état final immédiat.
- Chaque SVG porte `role="img"` avec `<title>` et `<desc>`.
- La couleur n'est jamais le seul encodage : au-dessus / en dessous de la ligne porte déjà le sens.

---

## 9. Ordre d'exécution

| # | Étape | Sortie |
|---|---|---|
| 1 | `mapping_secteurs.csv` + `build_data.py` avec assertions | `data.json` conforme à la section 2 |
| 2 | Plan de design en deux passes, avec la critique écrite | Tokens définitifs |
| 3 | `tokens.css`, `main.css`, squelette `index.html`, typographie | Page vide mais correctement composée |
| 4 | Écran 1, le graphique de flottaison, statique d'abord | La signature fonctionne ou est remplacée |
| 5 | Écrans 2, 3, 4 | Les quatre scènes |
| 6 | Bascules de scénario + transitions | Interaction |
| 7 | Séquence d'entrée, responsive, accessibilité | Finition |
| 8 | Relecture critique : retirer un élément | Livrable |

À l'étape 8, appliquer le conseil de Chanel : regarder la page et **enlever un accessoire**.
Il y en aura un de trop.

**Accessoire retiré :** l'écran 1 expliquait son encodage **trois fois** — dans le chapô, dans
la légende de figure, puis dans un paragraphe de lecture. Le paragraphe a été supprimé et son
seul apport propre (l'encours ventilé de 44 336 MRU M, et le sens des hachures) replié dans la
légende de figure. L'écran perd un bloc de texte et ne perd aucune information.

---

## 10. Écueils à surveiller

- Le fichier crédit est **antichronologique** ; l'axe des temps sera inversé si on ne trie pas.
- La ligne `TOTAL` du bloc B ne doit jamais entrer dans les calculs de parts.
- `Crédit_bancaire.xlsx` contient des colonnes `None` en trop — les supprimer au parsing.
- Ne jamais additionner PIB au prix du marché et VA sectorielles : la différence, ce sont les
  impôts nets de subventions. Utiliser le PIB au **coût des facteurs** comme dénominateur global.
- Les cellules vides de `FINAN.xlsx` sont des chaînes `''`, pas des `NaN`.
- Vérifier que la somme des écarts de l'écran 2 revient exactement à zéro à l'affichage. Sinon
  le waterfall ment. **Le piège s'est réalisé** : en 2017 hors extraction, les écarts arrondis
  à l'unité donnent 5 052 + 2 220 − 584 − 730 − 5 959 = **−1**. Corrigé par un arrondi à somme
  nulle (méthode du plus fort reste) dans le pipeline : la géométrie utilise la valeur exacte,
  les étiquettes utilisent l'entier corrigé, et les deux sommes valent zéro sur les 12 scénarios.

Écueils découverts en cours de route :

- **Les propriétés géométriques SVG posées en attribut se transitionnent bien** en CSS
  (`x`, `y`, `width`, `height`) — le doute vient d'ailleurs : Chrome peut annoncer
  `prefers-reduced-motion: reduce`, ce qui met toutes les durées à 0 et donne l'illusion
  d'un bug. Vérifier ce média avant de conclure quoi que ce soit sur les animations.
- **Un élément de grille CSS refuse de passer sous la largeur de son contenu** (`min-width: auto`
  par défaut). Une figure large dans une grille fait défiler la page entière ; il faut
  `min-width: 0` sur l'élément de grille.
- Les libellés longs d'un segment terminal débordent du `viewBox` : les aligner à droite, et
  décaler d'un cran les segments étroits voisins.
- Le secteur de tête change selon le scénario : les titres doivent gérer l'article et l'accord
  (« **La pêche** reçoit… » en 2015, « **Le BTP** reçoit… » en 2017), sinon la première bascule
  produit « Le Pêche ».

---

## 11. Récapitulatif des révisions

Ce que la confrontation aux fichiers sources et à la mise en œuvre a changé.

### Erreurs du plan, corrigées

| # | Point | Correction |
|---|---|---|
| 1 | Écran 4 mélangeait deux dénominateurs : les 41 % de résidu sont une part du **crédit**, pas du PIB | Deux barres séparées, chacune à 100 % de sa grandeur |
| 2 | Contrôle « résidu réparti au prorata » sans effet (au prorata du crédit, les parts sont inchangées) | Répartition au **poids économique** ; révèle en prime l'invariance des écarts |
| 3 | « L'IFR est stable selon l'année » — faux pour le commerce (0,96 → 1,13) et la pêche (2,20 → 1,62) | Affirmation resserrée sur les extrêmes, qui eux sont stables |
| 4 | `--absent #6B5B7B` à 2,80:1 sur `--abysse`, sous le plancher de 3:1 | `#9A6E96`, 4,14:1, plus deux règles de cohabitation |
| 5 | Encodage du graphique signature ambigu (deux quantités dans un rectangle) | Barres à largeur variable ; l'aire devient la part du crédit |
| 6 | « 22 branches » de VA | 20 |
| 7 | Chemins et noms de fichiers supposés (`data/raw/`, underscores) | Racine du projet, espaces |

### Vérifications

Tous les chiffres de la section 2 sont reproduits **exactement** par le pipeline, y compris le
`2,12` limite du BTP hors extraction. 142 contrôles, dont la somme nulle des écarts sur les
12 scénarios et l'invariance des écarts au traitement du résidu sur les 6 combinaisons.

### Décisions techniques prises en route

- D3 abandonné ; polices et données embarquées ; la page fonctionne **hors ligne et sans serveur**.
- Colonnes D–F du bloc B (hypothèse saisie à la main) **exclues** de tout affichage.
- Colonne « Country wide » de `FINAN.xlsx` ignorée, faute de définition.
- Sur l'écran 3, ce sont les **coopératives** dont le nombre d'institutions chute de 98 à 23 en
  2014 *sans que leur nombre d'agences bouge* : c'est bien une rupture de série, annotée comme
  telle et non lissée.

### Deuxième passe — thème clair, interactivité, anneaux

| # | Demande | Ce qu'il a fallu faire |
|---|---|---|
| 8 | Dashboard en **mode clair** | Palette clair **re-dérivée et re-validée** contre sa propre surface, pas inversée. Le clair est désormais le défaut ; le sombre reste accessible (réglage système ou bouton). |
| 9 | Graphiques **interactifs** | Infobulles sur les marques, viseur sur les deux séries temporelles, accès clavier complet. Le principe « lisible sans survol » devient une contrainte de conception, pas une interdiction. |
| 10 | Écran 4 en **secteurs circulaires** | Deux anneaux, chiffre clé au centre (contourne l'anti-patron du camembert à deux parts). |
| 11 | « Ce graphe est biaisé, pourquoi pas une barre simple ? » | **Objection fondée.** Le waterfall de l'écran 2 est remplacé par des barres divergentes sur ligne de base unique et échelle symétrique. |
| 12 | « Sur les anneaux, une seule modalité est affichée, au centre » | **Objection fondée.** Chaque part porte désormais son nom et son pourcentage sur la couronne ; le centre passe de la répétition à l'agrégat (31,4 % non couvert) ou au montant (30 810 MRU M). |
| 13 | « Moins de texte, des KPI en haut, des interprétations concrètes — comme Power BI / Tableau » | **Refonte de la mise en page.** Le récit scrollé en quatre actes devient un tableau de bord : bandeau de 6 KPI, grille de 7 cartes, une phrase chiffrée par carte, tout le reste replié en annexe. |
| 14 | Reprendre l'habillage d'un modèle fourni ; rubriques de nav remplacées par les filtres | Barre de nav blanche arrondie, tuiles KPI teintées à icône, cartes blanches sur fond lavande. Filtres en `<select>` natifs. |
| 15 | Marque **Open Community** et son logo à la place de l'icône générique | Le JPEG fourni est recadré sur la marque et converti en PNG à fond transparent (`img/openmr-logo.png`, 96 px, 2,4 Ko) ; l'encre noire est inversée en thème sombre plutôt que d'entretenir deux fichiers. La pastille teintée disparaît : un logo réel se pose nu, sinon il se lit comme une icône. |
| 16 | « Que le style prenne les couleurs de la marque : des noirs clairs, du blanc et ses dérivées » | **Palette monochrome dérivée du logo.** Rampe d'encre en cinq degrés, mesurée (`node scripts/palette.js`). La teinte ne code plus rien : le contrôle passe du ΔE daltonien — sans objet sur une palette achromatique — au **ΔL\* entre marques voisines**, plancher 10. Là où la teinte travaillait seule, un second encodage la remplace : tracés plein/tireté/pointillé sur « agences », pastille hachurée dans la légende des anneaux, italique sur les branches orphelines. Corrigé au passage : le chiffre central des anneaux se rendait à 12 px au lieu de 28, l'attribut `font-size` étant écrasé par la règle `.val`. |
| 17 | « Pas comme ça : `#000000` avec une autre » | **Les pôles s'opposent par la densité, plus par la nuance.** Deux gris moyens donnaient une image délavée : le déficit passe au **noir plein `#000000`**, le surfinancement à un **aplat pâle cerclé de ce noir** (blanc plein contre aplat sombre en thème sombre). `--emerge` est scindé — il servait à la fois d'aplat et de texte : l'aplat devient `--aplat`, l'encre reste `--emerge`. `--aplat` ne tient que 1,4:1 et c'est assumé, son filet en `--immerge` tient 21:1 ; le contrôle vérifie à chaque scénario qu'aucun aplat n'est laissé sans filet. |
| 18 | Donner à l'écran 1 un statut de « héros » pour le premier regard du jury | **Un accent unique, confiné à l'écran 1.** `--accent` = rouge du drapeau mauritanien (`#CD2A3E` clair, `#F2685C` sombre, 5,3:1 et 5,8:1). Il ne colore **pas** les barres : l'écart est la même donnée à l'écran 1 et à l'écran 2, il serait rouge ici et noir là. Il marque ce qui n'existe que sur l'écran 1 — ligne de parité et zone du crédit manquant. Le contrôle des 24 scénarios vérifie qu'aucune marque accentuée ne sort de cette carte. |
| 19 | Étendre l'accent à la tuile KPI « crédit manquant » | **Seule entorse au confinement, et elle est motivée** : cette tuile chiffre exactement la zone hachurée de l'écran 1. Même quantité, même couleur — sinon le chiffre-titre et le graphique héros ne se parlent pas, alors que la bande KPI est scannée en premier. Lavis, chiffre et icône en accent, mesurés (4,65:1 et 3,48:1 en clair ; 5,13:1 et 3,93:1 en sombre). Le contrôle admet désormais deux zones d'accent, et deux seulement. |
| 20 | Rendre les six KPI interactifs | Chaque tuile ouvre le détail de son chiffre — origine et terme de comparaison — au survol, au toucher et au focus clavier, via l'infobulle déjà en place. `tabindex` posé en JS (sans JS, six étapes de tabulation vides) ; un `click` complète le survol, car au doigt `pointerleave` part dès que le contact cesse et le tap ne laissait qu'un éclair ; le relief est neutralisé sous `prefers-reduced-motion`. 72 infobulles vérifiées sur les 12 scénarios, aucune valeur manquante. |
| 21 | « Les chiffres montent depuis zéro, les graphes se forment » | **Cinq primitives d'animation** (`A.anim` dans `lib.js`) : compteur, tracé qui se dessine, volet de découpe, boucle de progression, déclenchement au défilement. Les 6 KPI comptent depuis 0 à l'entrée (1 000 ms) et depuis l'ancienne valeur à chaque bascule (420 ms) — repartir de zéro clignoterait. Les 7 figures s'animent quand **leur carte** entre dans le champ, une seule fois. Règle intangible : l'animation décore, elle ne porte pas d'information — sous `prefers-reduced-motion` tout se pose d'emblée et l'image d'arrivée reste complète. Sweep des 24 scénarios rejoué mouvement activé. |

Ce que la reprise du modèle a imposé de revalider — les graphiques vivent désormais
sur une **carte** et non plus sur le fond de page, donc la surface de référence change :

- carte sombre `#123946` faisait retomber `--absent` à **2,97:1** ; portée à `#0F2A36`
  (absent 3,6:1) ;
- `.f-fond` / `.s-fond` pointent sur `--carte`, sinon les respirations entre aires
  empilées et les libellés écrits dans les barres gardaient la couleur du fond de page ;
- sur les tuiles KPI, la couleur pleine sur son propre lavis ne tenait que **3,99:1** :
  le chiffre passe en encre, la teinte reste sur la tuile, et le lavis descend à 10 %
  en thème sombre (18 % en clair) où l'étiquette tombait à 3,85:1 ;
- chaque tuile porte une icône de direction, pour que le sens ne repose pas sur la
  seule couleur.

Le `<select>` du résidu affiche « exclu / réparti » et non le libellé complet : un
`<select>` se dimensionne sur son option la plus longue et « réparti au poids
économique » déséquilibrait la barre. Le sens complet est dans `title=` et en annexe.

### Passe 3 — du récit au tableau de bord

Ce que la refonte a changé, et ce qu'elle a coûté :

- **Structure.** En-tête compact + phrase de paramètres collante + bandeau KPI + grille de
  cartes. Les quatre « écrans » disparaissent en tant que sections narratives ; les sept
  figures deviennent des tuiles.
- **Texte.** Chapôs, légendes et paragraphes de lecture supprimés. Chaque carte porte
  **une phrase chiffrée**, construite dynamiquement, qui se met à jour avec le scénario.
  Table des chiffres, correspondance des nomenclatures et limites méthodologiques sont
  repliées dans un `<details>` en pied de page — présentes pour qui les cherche,
  invisibles pour qui ne les cherche pas.
- **Les KPI ne sont pas des cartes à icône.** Le brief interdisait « grand chiffre + petite
  étiquette + icône dans un cercle coloré ». Le bandeau garde le chiffre et l'étiquette,
  sans icône, sans carte, séparés par un simple filet.
- **Cartes à filet, pas à aplat.** Un fond de carte aurait changé la surface de référence de
  toutes les marques : `--absent` tombe à **2,97:1** sur `--profond` en thème sombre. Les
  cartes sont donc un filet sur le fond de page, ce qui préserve les contrastes validés.

Deux pièges de mise à l'échelle, tous deux dus au passage en demi-largeur :

- Un `viewBox` de 1000 unités affiché dans une carte de 600 px met les libellés à 8 px.
  Les `viewBox` ont été recalés sur la largeur de rendu réelle (700 pour les demi-cartes,
  1400 pour la carte pleine), pour que 1 unité ≈ 1 px partout.
- À trois colonnes, l'échelle retombait à 0,63. Le plancher de colonne est passé à 560 px
  pour forcer deux colonnes. Les figures carrées (Lorenz, anneaux) sont bornées à 430 px :
  sans cela leur `viewBox` s'étirait à 2× et leurs graduations devenaient énormes.

Le point 11 mérite d'être retenu : la cascade était une idée de mise en scène (« montrer que
le total revient à zéro ») qui s'est payée en lisibilité sur le message principal. Quand une
forme oblige le lecteur à corriger mentalement ce qu'il voit, c'est la forme qui a tort.

Trois pièges rencontrés :

- **`--sable` servait de couleur de remplissage** à l'écran 4 alors que c'est un token de
  *texte*. Invisible en sombre, cassant en clair (l'encre y est presque noire). D'où le
  token `--connu`, dédié au remplissage et validé dans les deux thèmes.
- **Les couleurs étaient figées dans des attributs `fill`** au moment du rendu : un
  changement de thème ne les aurait pas suivies. Tout est passé en classes CSS, ce qui rend
  la bascule purement déclarative — aucun graphique n'est reconstruit.
- Les anneaux héritaient de la **largeur plancher de 660 px** posée pour les figures larges
  en petit écran ; carrés, ils n'en ont pas besoin et débordaient.

### Reste ouvert

- La ligne de flottaison n'est pour l'instant un objet de niveau page que sur la couverture ;
  la faire réapparaître à hauteur constante dans chaque écran reste à faire si le temps le permet.
- Les données de l'écran 3 (maturité, agences) ne réagissent à aucune bascule — c'est voulu,
  elles ne dépendent d'aucune hypothèse, mais un jury peut le demander.
