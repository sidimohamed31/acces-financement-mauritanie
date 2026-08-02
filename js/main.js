/* main.js — état des hypothèses, KPI, lignes de lecture, thème, séquence d'entrée. */

(function (A) {
  'use strict';

  var D = window.DATA;
  var $ = function (id) { return document.getElementById(id); };

  var premierRendu = true;
  var etat = { annee: D.meta.annee_defaut, extraction: 'incl', residu: 'excl' };
  var DEFAUT = { annee: D.meta.annee_defaut, extraction: 'incl', residu: 'excl' };

  /* ---------------------------------------------------------------- thème --
     Le clair est la valeur par défaut ; le sombre suit le réglage système ou
     un choix explicite. Toutes les couleurs de marque passent par des classes
     CSS, donc basculer ne redessine rien — les variables suffisent. */

  function themeActif() {
    var f = document.documentElement.getAttribute('data-theme');
    if (f) return f;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function poserTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) { /* navigation privée */ }
    var b = $('theme');
    if (b) {
      b.textContent = t === 'dark' ? 'mode clair' : 'mode sombre';
      b.setAttribute('aria-pressed', String(t === 'dark'));
      b.setAttribute('aria-label', t === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre');
    }
  }

  function scenario() {
    return D.scenarios[etat.annee + '|' + etat.extraction + '|' + etat.residu];
  }

  /* ------------------------------------------------------------- filtres --
     <select> natifs plutôt qu'un menu maison : clavier, lecteurs d'écran et
     affichage mobile fonctionnent sans code à maintenir. */

  var FILTRES = [
    { id: 'f-annee', cle: 'annee' },
    { id: 'f-extraction', cle: 'extraction' },
    { id: 'f-residu', cle: 'residu' }
  ];

  function cablerFiltres() {
    // L'année est la seule liste dont les options viennent des données.
    var sa = $('f-annee');
    D.meta.annees.forEach(function (a) {
      var o = document.createElement('option');
      o.value = String(a);
      o.textContent = String(a);
      sa.appendChild(o);
    });

    FILTRES.forEach(function (f) {
      $(f.id).addEventListener('change', function (ev) {
        var v = ev.target.value;
        etat[f.cle] = f.cle === 'annee' ? parseInt(v, 10) : v;
        rafraichir();
      });
    });
  }

  function syncFiltres() {
    FILTRES.forEach(function (f) { $(f.id).value = String(etat[f.cle]); });
  }

  /* ----------------------------------------------------------- vocabulaire --
     Le secteur de tête change avec le scénario (en 2015 c'est la pêche) :
     il faut le bon article, sinon la ligne de lecture se casse à la bascule. */

  var LEX = {
    btp:        { det: 'le BTP', datif: 'au BTP' },
    peche:      { det: 'la pêche', datif: 'à la pêche' },
    commerce:   { det: 'le commerce', datif: 'au commerce' },
    services:   { det: 'les services', datif: 'aux services' },
    industries: { det: 'les industries', datif: 'aux industries' }
  };

  function lex(s) {
    if (s.id === 'industries' && etat.extraction === 'excl') {
      return { det: 'les industries manufacturières', datif: 'aux industries manufacturières' };
    }
    return LEX[s.id];
  }

  /* Construit une phrase à trous : les fragments {v:…} deviennent des <span>
     colorés. textContent partout, jamais de concaténation d'innerHTML. */
  function phrase(hote, morceaux) {
    hote.textContent = '';
    morceaux.forEach(function (m) {
      if (typeof m === 'string') {
        hote.appendChild(document.createTextNode(m));
      } else {
        var s = document.createElement('span');
        s.className = m.c || 'n';
        s.textContent = m.v;
        hote.appendChild(s);
      }
    });
  }

  /* ------------------------------------------------------- KPI et lectures -- */

  function textes(sc) {
    var haut = sc.secteurs[0];
    var bas = sc.secteurs[sc.secteurs.length - 1];
    var pire = sc.secteurs.slice().sort(function (a, b) { return a.ecart - b.ecart; })[0];
    var top = sc.secteurs.slice().sort(function (a, b) { return b.ecart - a.ecart; })[0];
    var surplus = sc.secteurs.reduce(function (t, s) { return t + (s.ecart > 0 ? s.ecart : 0); }, 0);
    var c = D.couverture;

    /* --- KPI ---------------------------------------------------------------
       Les chiffres montent jusqu'à leur valeur au lieu de s'y poser. Chaque
       tuile retient sa valeur numérique : au premier affichage elle part de
       zéro, à un changement de filtre elle part de l'ancienne — revenir à
       zéro à chaque bascule donnerait un clignotement, pas une lecture.
       La durée est plus courte en bascule qu'à l'entrée. */
    var duree = premierRendu ? 1000 : 420;
    A.anim.nombre($('k-max'), haut.ifr, function (v) { return A.fmt(v, 2); }, duree);
    $('k-max-l').textContent = haut.nom;
    A.anim.nombre($('k-min'), bas.ifr, function (v) { return A.fmt(v, 2); }, duree);
    $('k-min-l').textContent = bas.nom;
    A.anim.nombre($('k-manque'), Math.abs(pire.ecart_aff) / 1000,
      function (v) { return A.fmt(v, 1) + A.NBSP + 'Md'; }, duree);
    $('k-manque-l').textContent = lex(pire).datif;
    A.anim.nombre($('k-conc'), surplus / sc.base_credit, A.pct, duree);
    A.anim.nombre($('k-ct'), D.maturite.part_ct_dec2020 / 100, A.pct, duree);
    A.anim.nombre($('k-void'), c.non_couvert / c.pib_cout_facteurs, A.pct, duree);
    // Densité : ne dépend d'aucun scénario, mais compte comme les autres.
    A.anim.nombre($('k-dens'), D.population.densite_banques,
      function (v) { return A.fmt(v, 1); }, duree);
    premierRendu = false;

    // --- lignes de lecture, une phrase chiffrée par carte -------------------
    phrase($('i1'), [
      'Pour 1 MRU de valeur ajoutée, ', lex(haut).det, ' capte ',
      { v: A.fmt(haut.ifr, 2), c: 'up' }, ' fois sa part de crédit, ',
      lex(bas).det, ' seulement ', { v: A.fmt(bas.ifr, 2), c: 'down' }, ' fois.'
    ]);

    phrase($('i2'), [
      { v: A.signe(top.ecart_aff), c: 'up' }, ' MRU M de trop pour ', lex(top).det,
      ', ', { v: A.signe(pire.ecart_aff), c: 'down' }, ' MRU M de moins ', lex(pire).datif,
      '. La somme revient exactement à zéro.'
    ]);

    phrase($('i3'), [
      'Il faudrait déplacer ', { v: A.pct(surplus / sc.base_credit) },
      ' de l\'encours ventilé, soit ', { v: A.mru(surplus) },
      ', pour que le crédit épouse le poids économique.'
    ]);

    // --- annexe -------------------------------------------------------------
    var tb = $('tbl-ifr');
    tb.textContent = '';
    sc.secteurs.forEach(function (s) {
      var tr = document.createElement('tr');
      [[s.nom, ''], [A.pct(s.part_va), 'num'], [A.pct(s.part_credit), 'num'],
       [A.fmt(s.ifr, 2), 'num'], [A.signe(s.ecart_aff), 'num']].forEach(function (c2) {
        var td = document.createElement('td');
        td.className = c2[1];
        td.textContent = c2[0];
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
  }

  function textesFixes() {
    var d = D.maturite, c = D.couverture, cr = D.credit;
    var L = D.inclusion.lignes, f19 = L[L.length - 1];

    phrase($('i4'), [
      { v: A.pct(d.part_ct_dec2020 / 100) },
      ' de l\'encours est à court terme : le système finance le fonds de roulement, ' +
      'pas l\'investissement. Sur quinze mois le long terme gagne ',
      { v: A.signe(d.var_mlt, 1) + A.NBSP + '%', c: 'down' }, ', le court terme perd ',
      { v: A.signe(d.var_ct, 1) + A.NBSP + '%', c: 'up' }, '.'
    ]);

    phrase($('i5'), [
      { v: A.fmt(f19.banques_agences) }, ' agences bancaires en 2019 contre 23 en 2004, ' +
      'mais seulement ', { v: A.fmt(f19.imf_agences) },
      ' en microfinance : le maillage s\'est densifié là où il était déjà.'
    ]);

    phrase($('i6'), [
      { v: A.pct(c.non_couvert / c.pib_cout_facteurs), c: 'void' },
      ' du PIB n\'a aucun poste de crédit correspondant, dont ',
      { v: A.pct(c.agro_pastoral / c.pib_cout_facteurs), c: 'void' },
      ' pour le seul agro-pastoral.'
    ]);

    phrase($('i7'), [
      { v: A.pct(cr.residu_part, 0), c: 'void' }, ' de l\'encours, soit ',
      { v: A.mru(cr.residu) }, ', reste en « consommation et autres » sans ventilation ' +
      'sectorielle publiée.'
    ]);

    // Les années proposées ne sont pas un choix éditorial : les comptes nationaux
    // s'arrêtent en 2017. On l'affiche pour qu'on ne le devine pas.
    var cv = D.meta.va_couverture, mo = D.maturite.mois;
    $('couv-src').textContent =
      'valeur ajoutée ' + cv[0] + '–' + cv[1] +
      ' (dernière année publiée : ' + cv[1] + ') · encours de crédit ' +
      mo[0].label + ' – ' + mo[mo.length - 1].label;

    $('a-genere').textContent = 'données générées le ' + D.meta.genere +
      ', ' + D.controles.reussis + ' contrôles de cohérence vérifiés.';
  }

  /* ------------------------------------------------------- KPI interactifs --
     Chaque tuile ouvre le détail du chiffre qu'elle porte : d'où il vient et
     avec quoi il se compare. Même contenu au survol, au toucher et au focus
     clavier — la tuile reste entièrement lisible sans, l'infobulle enrichit.

     Le tabindex est posé ici et non dans le HTML : sans JavaScript il n'y
     aurait rien à montrer, et six étapes de tabulation vides seraient une
     nuisance pour qui navigue au clavier. */

  /* Provenance : les libellés viennent de DATA.meta.sources, produits par le
     pipeline. Un chiffre sans son jeu de données est une affirmation — chaque
     infobulle nomme donc le ou les classeurs dont sa valeur est tirée, et
     l'indice, qui croise les deux, les nomme tous les deux. */
  var SRC = D.meta.sources;

  function detailSecteur(s) {
    return [
      { nom: 'part de la VA', valeur: A.pct(s.part_va) },
      { nom: 'part du crédit', valeur: A.pct(s.part_credit) },
      { nom: 'indice (IFR)', valeur: A.fmt(s.ifr, 2) },
      { nom: 'écart', valeur: A.signe(s.ecart_aff) + A.NBSP + 'MRU M' }
    ];
  }

  var KPIS = [
    { id: 'k-max', info: function () {
        var s = scenario().secteurs[0];
        return { titre: 'Mieux financé que son poids — ' + s.nom,
                 lignes: detailSecteur(s), sources: [SRC.va, SRC.credit] };
      } },

    { id: 'k-min', info: function () {
        var sc = scenario(), s = sc.secteurs[sc.secteurs.length - 1];
        return { titre: 'Moins financé que son poids — ' + s.nom,
                 lignes: detailSecteur(s), sources: [SRC.va, SRC.credit] };
      } },

    { id: 'k-manque', info: function () {
        var sc = scenario();
        var pire = sc.secteurs.slice().sort(function (a, b) { return a.ecart - b.ecart; })[0];
        return {
          titre: 'Déficit le plus lourd — ' + pire.nom,
          lignes: [
            // La pastille reprend l'accent : c'est la zone hachurée de l'écran 1.
            { nom: 'crédit manquant', valeur: A.mru(Math.abs(pire.ecart_aff)), couleur: '--accent' },
            { nom: 'part de la VA', valeur: A.pct(pire.part_va) },
            { nom: 'part du crédit', valeur: A.pct(pire.part_credit) },
            { nom: 'indice (IFR)', valeur: A.fmt(pire.ifr, 2) }
          ],
          sources: [SRC.va, SRC.credit]
        };
      } },

    { id: 'k-conc', info: function () {
        var sc = scenario();
        var surplus = sc.secteurs.reduce(function (t, s) { return t + (s.ecart > 0 ? s.ecart : 0); }, 0);
        return {
          titre: 'Réallocation nécessaire',
          lignes: [
            { nom: 'somme des excédents', valeur: A.mru(surplus) },
            { nom: 'encours ventilé', valeur: A.mru(sc.base_credit) },
            { nom: 'part à déplacer', valeur: A.pct(surplus / sc.base_credit) }
          ],
          sources: [SRC.va, SRC.credit]
        };
      } },

    { id: 'k-ct', info: function () {
        var d = D.maturite;
        return {
          titre: 'Maturité de l\'encours',
          lignes: [
            { nom: 'court terme, déc. 2020', valeur: A.pct(d.part_ct_dec2020 / 100) },
            { nom: 'court terme, 15 mois', valeur: A.signe(d.var_ct, 1) + A.NBSP + '%' },
            { nom: 'moyen-long terme, 15 mois', valeur: A.signe(d.var_mlt, 1) + A.NBSP + '%' }
          ],
          sources: [SRC.credit]
        };
      } },

    { id: 'k-void', info: function () {
        var c = D.couverture;
        return {
          titre: 'PIB sans poste de crédit',
          lignes: [
            { nom: 'non couvert', valeur: A.mru(c.non_couvert) },
            { nom: 'dont agro-pastoral', valeur: A.mru(c.agro_pastoral) },
            { nom: 'PIB au coût des facteurs', valeur: A.mru(c.pib_cout_facteurs) }
          ],
          sources: [SRC.va]
        };
      } },

    /* Densité d'agences. Le numérateur vient de FINAN, le dénominateur de
       Population : deux sources croisées, donc les deux sont nommées. On
       montre aussi le total toutes institutions — les banques seules ne
       disent pas la même chose que l'ensemble des points de service. */
    { id: 'k-dens', info: function () {
        var p = D.population;
        return {
          titre: 'Maillage financier, ' + p.annee,
          lignes: [
            { nom: 'agences bancaires', valeur: A.fmt(p.agences_banques) },
            { nom: 'toutes institutions', valeur: A.fmt(p.agences_toutes) },
            { nom: 'population', valeur: A.fmt(p.total) + ' hab.' },
            { nom: 'banques / 100 000 hab.', valeur: A.fmt(p.densite_banques, 1) },
            { nom: 'toutes / 100 000 hab.', valeur: A.fmt(p.densite_toutes, 1) }
          ],
          sources: [SRC.inclusion, SRC.population]
        };
      } }
  ];

  function cablerKpis() {
    KPIS.forEach(function (k) {
      var cible = $(k.id) && $(k.id).closest('.kpi');
      if (!cible) return;
      cible.tabIndex = 0;
      A.survol(cible, k.info);

      /* Au doigt, pointerleave se déclenche dès que le contact cesse : un tap
         ne laisserait qu'un éclair. Le clic rouvre la bulle et l'y laisse. */
      cible.addEventListener('click', function (ev) {
        var d = k.info(ev);
        if (d) A.bulle.montrer(d.titre, d.lignes, ev.clientX, ev.clientY, d.sources);
      });
    });

    // ...et un appui hors des tuiles la referme, sinon elle resterait collée.
    document.addEventListener('click', function (ev) {
      if (!ev.target.closest || !ev.target.closest('.kpi')) A.bulle.cacher();
    });
  }

  /* --------------------------------------------------------------- rendu -- */

  function rafraichir() {
    var sc = scenario();
    syncFiltres();
    textes(sc);
    A.waterline.update(sc);
    A.gap.update(sc);
  }

  function demarrer() {
    cablerFiltres();
    cablerKpis();

    poserTheme(themeActif());
    $('theme').addEventListener('click', function () {
      poserTheme(themeActif() === 'dark' ? 'light' : 'dark');
    });

    $('reset').addEventListener('click', function () {
      etat.annee = DEFAUT.annee;
      etat.extraction = DEFAUT.extraction;
      etat.residu = DEFAUT.residu;
      rafraichir();
    });

    A.waterline.init($('fig-flottaison'));
    A.gap.init($('fig-waterfall'), $('a-totaux'));
    A.gap.initLorenz($('fig-lorenz'));
    A.flow.maturite($('fig-maturite'));
    A.flow.agences($('fig-agences'));
    A.blindspots.init($('fig-couv-pib'), $('leg-couv-pib'),
      $('fig-couv-credit'), $('leg-couv-credit'),
      document.querySelector('.corresp'));

    textesFixes();
    rafraichir();

    /* Séquence d'entrée. Chaque figure se joue quand SA carte entre dans le
       champ, une seule fois : jouer les sept au chargement gaspillerait cinq
       animations que personne ne verrait, et le lecteur qui descend trouverait
       des graphiques déjà posés. L'écran 1 étant au-dessus de la ligne de
       flottaison, il part immédiatement. */
    var carte = function (idFig) {
      var f = $(idFig);
      return f && f.closest('.carte');
    };

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        A.anim.auRegard(carte('fig-flottaison'), function () { A.waterline.entrer(scenario()); });
        A.anim.auRegard(carte('fig-waterfall'), function () { A.gap.entrer(scenario()); });
        A.anim.auRegard(carte('fig-lorenz'), A.gap.entrerLorenz);
        A.anim.auRegard(carte('fig-maturite'), A.flow.entrerMaturite);
        A.anim.auRegard(carte('fig-agences'), A.flow.entrerAgences);
        A.anim.auRegard(carte('fig-couv-pib'), function () { A.blindspots.entrees.pib(); });
        A.anim.auRegard(carte('fig-couv-credit'), function () { A.blindspots.entrees.credit(); });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }
})(window.APP);
