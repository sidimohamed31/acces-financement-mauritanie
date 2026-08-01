/* scene-flow.js — écran 3 : maturité de l'encours, puis maillage des agences.
 *
 * Le court terme est ce qui flotte en surface (--emerge), le moyen-long terme
 * ce qui travaille en profondeur (--immerge) : même axe sémantique que la
 * ligne de flottaison, pas une réutilisation décorative des couleurs.
 *
 * Ces deux figures ne dépendent d'aucun scénario : elles se dessinent une fois.
 * Toutes deux portent un viseur : le lecteur vise une date, jamais un trait de 2 px.
 */

(function (A) {
  'use strict';

  // Entrées différées : chaque figure se joue quand elle entre dans le champ,
  // et pas au chargement — sinon elle serait passée avant qu'on y arrive.
  var mEntree, aEntree;

  /* Viseur commun aux deux séries temporelles : trait vertical + pastilles,
     une seule infobulle listant TOUTES les séries à cette abscisse. */
  function viseur(svg, opts) {
    var g = A.el('g', { class: 'viseur' }, svg);
    var trait = A.el('line', {
      y1: opts.haut, y2: opts.bas, class: 's-brume', 'stroke-width': 1
    }, g);
    var pastilles = opts.series.map(function (s) {
      return A.el('circle', { r: 4.5, class: s.couleur.replace('--', 'f-'), stroke: 'none' }, g);
    });
    var anneaux = opts.series.map(function () {
      return A.el('circle', { r: 4.5, fill: 'none', class: 's-fond', 'stroke-width': 2 }, g);
    });

    var zone = A.el('rect', {
      x: opts.gauche, y: opts.haut,
      width: opts.droite - opts.gauche, height: opts.bas - opts.haut,
      class: 'hit', tabindex: 0, role: 'img'
    }, svg);
    zone.setAttribute('aria-label', opts.aria);

    var courant = -1;

    function placer(i, cx, cy) {
      if (i < 0 || i === courant && cx === undefined) return;
      courant = i;
      var p = opts.point(i);
      trait.setAttribute('x1', p.x); trait.setAttribute('x2', p.x);
      p.ys.forEach(function (yy, k) {
        pastilles[k].setAttribute('cx', p.x); pastilles[k].setAttribute('cy', yy);
        anneaux[k].setAttribute('cx', p.x); anneaux[k].setAttribute('cy', yy);
      });
      g.classList.add('actif');
      var d = opts.info(i);
      A.bulle.montrer(d.titre, d.lignes, cx, cy);
    }

    function depuisEvenement(ev) {
      var r = svg.getBoundingClientRect();
      var vx = (ev.clientX - r.left) / r.width * opts.vbW;
      placer(opts.index(vx), ev.clientX, ev.clientY);
    }

    zone.addEventListener('pointerenter', depuisEvenement);
    zone.addEventListener('pointermove', depuisEvenement);
    zone.addEventListener('pointerleave', function () {
      g.classList.remove('actif'); courant = -1; A.bulle.cacher();
    });
    zone.addEventListener('focus', function () {
      var r = zone.getBoundingClientRect();
      placer(courant < 0 ? opts.n - 1 : courant, r.right - 40, r.top + 40);
    });
    zone.addEventListener('blur', function () {
      g.classList.remove('actif'); A.bulle.cacher();
    });
    // au clavier, on parcourt la série au lieu de viser à la souris
    zone.addEventListener('keydown', function (ev) {
      var pas = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
      if (!pas) return;
      ev.preventDefault();
      var i = Math.max(0, Math.min(opts.n - 1, (courant < 0 ? opts.n - 1 : courant) + pas));
      var r = zone.getBoundingClientRect();
      var p = opts.point(i);
      placer(i, r.left + p.x / opts.vbW * r.width, r.top + 40);
    });
  }

  /* ------------------------------------------- aire empilée CT / MLT ------ */

  // viewBox calé sur la largeur de rendu réelle d'une demi-carte : à 1000 unités
  // affichées dans ~600 px, les libellés tombaient sous 8 px. mr réserve la
  // colonne des étiquettes directes.
  var VB = { w: 700, h: 330, ml: 58, mr: 150, mt: 26, mb: 46 };

  function maturite(host) {
    var m = window.DATA.maturite.mois;          // déjà remis en ordre chronologique
    var PW = VB.w - VB.ml - VB.mr, PH = VB.h - VB.mt - VB.mb;
    var yMax = 80000;
    var X = function (i) { return VB.ml + (i / (m.length - 1)) * PW; };
    var Y = function (v) { return VB.mt + PH * (1 - v / yMax); };

    var svg = A.scene(host, VB, 'Encours de crédit par maturité, janvier 2020 à mars 2021',
      'Aire empilée : le court terme représente environ 64 % de l\'encours sur toute la ' +
      'période, tandis que le moyen et long terme progresse lentement.');

    for (var v = 0; v <= yMax; v += 20000) {
      A.el('line', { x1: VB.ml, x2: VB.ml + PW, y1: Y(v), y2: Y(v), class: 'grille-l', opacity: 0.4 }, svg);
      A.el('text', { x: VB.ml - 12, y: Y(v) + 4, class: 'axe', 'text-anchor': 'end', text: A.fmt(v) }, svg);
    }

    // CT empilé au-dessus du MLT : le MLT est le socle, le CT ce qui flotte dessus.
    var basMlt = m.map(function (d, i) { return [X(i), Y(0)]; });
    var hautMlt = m.map(function (d, i) { return [X(i), Y(d.mlt)]; });
    var hautTot = m.map(function (d, i) { return [X(i), Y(d.mlt + d.ct)]; });

    var aireMlt = A.el('path', {
      d: A.chemin(hautMlt) + ' ' + A.chemin(basMlt.slice().reverse()).replace('M', 'L') + ' Z',
      class: 'f-immerge', opacity: 0.9
    }, svg);
    // Aplat pâle : c'est son filet qui le détache de la carte, pas son ton.
    var aireCt = A.el('path', {
      d: A.chemin(hautTot) + ' ' + A.chemin(hautMlt.slice().reverse()).replace('M', 'L') + ' Z',
      class: 'f-aplat s-immerge', 'stroke-width': 1.2, opacity: 0.9
    }, svg);
    // 2px de respiration entre les deux aires empilées
    var sep = A.el('path', { d: A.chemin(hautMlt), fill: 'none', class: 's-fond', 'stroke-width': 2 }, svg);

    // étiquettes directes en bout de série : l'information ne dépend pas du survol
    var dernier = m.length - 1, d = m[dernier];
    var etiq = [
      A.el('text', { x: X(dernier) + 10, y: Y(d.mlt + d.ct / 2) + 4, class: 'val f-emerge', 'font-size': 11.5, text: 'court terme' }, svg),
      A.el('text', { x: X(dernier) + 10, y: Y(d.mlt + d.ct / 2) + 19, class: 'axe f-emerge', 'font-size': 11, text: A.signe(window.DATA.maturite.var_ct, 1) + ' %' }, svg),
      A.el('text', { x: X(dernier) + 10, y: Y(d.mlt / 2) + 4, class: 'val f-immerge', 'font-size': 11.5, text: 'moyen-long terme' }, svg),
      A.el('text', { x: X(dernier) + 10, y: Y(d.mlt / 2) + 19, class: 'axe f-immerge', 'font-size': 11, text: A.signe(window.DATA.maturite.var_mlt, 1) + ' %' }, svg)
    ];

    /* Le volet ne couvre que les données : la grille et l'axe sont le cadre,
       ils sont là avant que la série ne se déroule. Sur quinze mois de temps,
       c'est le temps lui-même qui passe de gauche à droite. */
    mEntree = function () {
      A.anim.volet(svg, [aireMlt, aireCt, sep], VB, 1100);
      A.anim.paraitre(etiq, 380, 780);
    };

    m.forEach(function (d, i) {
      if (i % 3 !== 0 && i !== m.length - 1) return;
      A.el('text', { x: X(i), y: VB.h - VB.mb + 22, class: 'axe', 'text-anchor': 'middle', text: d.label.replace('.', '') }, svg);
    });

    viseur(svg, {
      vbW: VB.w, n: m.length, gauche: VB.ml, droite: VB.ml + PW, haut: VB.mt, bas: Y(0),
      series: [{ couleur: '--emerge' }, { couleur: '--immerge' }],
      aria: 'Encours mensuel par maturité. Flèches gauche et droite pour parcourir les mois.',
      index: function (vx) {
        return Math.max(0, Math.min(m.length - 1, Math.round((vx - VB.ml) / PW * (m.length - 1))));
      },
      point: function (i) {
        return { x: X(i), ys: [Y(m[i].mlt + m[i].ct), Y(m[i].mlt)] };
      },
      info: function (i) {
        var t = m[i].ct + m[i].mlt;
        return {
          titre: m[i].label,
          lignes: [
            { nom: 'court terme', valeur: A.fmt(m[i].ct), couleur: '--emerge' },
            { nom: 'moyen et long terme', valeur: A.fmt(m[i].mlt), couleur: '--immerge' },
            { nom: 'total', valeur: A.fmt(t) },
            { nom: 'part court terme', valeur: A.pct(m[i].ct / t) }
          ]
        };
      }
    });
  }

  /* ------------------------------------------------ agences 2004-2019 ----- */

  var VB2 = { w: 700, h: 290, ml: 46, mr: 132, mt: 24, mb: 44 };

  function agences(host) {
    var L = window.DATA.inclusion.lignes;
    var PW = VB2.w - VB2.ml - VB2.mr, PH = VB2.h - VB2.mt - VB2.mb;
    var yMax = 300;
    var a0 = L[0].annee, a1 = L[L.length - 1].annee;
    var X = function (a) { return VB2.ml + ((a - a0) / (a1 - a0)) * PW; };
    var Y = function (v) { return VB2.mt + PH * (1 - v / yMax); };

    var svg = A.scene(host, VB2, 'Nombre d\'agences par type d\'institution, 2004-2019',
      'Les agences bancaires passent de 23 à 291. Les agences de microfinance passent ' +
      'de 2 à 16. Le nombre de coopératives connaît une rupture de série en 2014.');

    for (var v = 0; v <= yMax; v += 100) {
      A.el('line', { x1: VB2.ml, x2: VB2.ml + PW, y1: Y(v), y2: Y(v), class: 'grille-l', opacity: 0.4 }, svg);
      A.el('text', { x: VB2.ml - 10, y: Y(v) + 4, class: 'axe', 'text-anchor': 'end', text: A.fmt(v) }, svg);
    }

    [2004, 2008, 2012, 2016, 2019].forEach(function (a) {
      A.el('text', { x: X(a), y: VB2.h - VB2.mb + 22, class: 'axe', 'text-anchor': 'middle', text: a }, svg);
    });

    // rupture de série signalée AVANT les courbes, pour rester en arrière-plan
    A.el('line', {
      x1: X(2014), x2: X(2014), y1: VB2.mt, y2: Y(0),
      class: 's-absent', 'stroke-width': 1, 'stroke-dasharray': '3 4'
    }, svg);
    A.el('text', {
      x: X(2014) + 6, y: VB2.mt + 11, class: 'axe f-absent', 'font-size': 10,
      text: '2014 — rupture'
    }, svg);

    // Noms courts : l'étiquette directe doit tenir dans la bande de droite.
    // Le nom complet reste dans le <title>/<desc> et dans l'infobulle.
    // La palette étant monochrome, trois traits de 2 px ne tiennent plus sur la
    // seule clarté : le tracé devient le second encodage. Plein pour la série
    // dominante, tireté pour les coopératives, pointillé pour la microfinance.
    var series = [
      { cle: 'banques_agences', nom: 'banques', couleur: '--sable', tirets: null },
      { cle: 'coop_agences', nom: 'coopératives', couleur: '--absent', tirets: '7 4' },
      // --immerge est réservé au pôle « déficit » depuis qu'il vaut le noir plein :
      // le réutiliser ici, à côté de --sable, donnerait deux traits identiques.
      { cle: 'imf_agences', nom: 'microfinance', couleur: '--brume', tirets: '1.5 4' }
    ];

    var traces = [], etiquettes = [];
    series.forEach(function (s) {
      var pts = L.filter(function (r) { return r[s.cle] !== null; })
                 .map(function (r) { return [X(r.annee), Y(r[s.cle])]; });
      var att = {
        d: A.chemin(pts), fill: 'none', class: s.couleur.replace('--', 's-'),
        'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
      };
      if (s.tirets) att['stroke-dasharray'] = s.tirets;
      traces.push(A.el('path', att, svg));
      var last = L[L.length - 1];
      // étiquette directe : l'identité ne repose jamais sur la seule couleur
      etiquettes.push(A.el('text', {
        x: X(a1) + 10, y: Y(last[s.cle]) + 4, class: 'val ' + s.couleur.replace('--', 'f-'),
        'font-size': 11.5, text: s.nom + ' ' + A.fmt(last[s.cle])
      }, svg));
    });

    /* Les trois courbes se dessinent de 2004 à 2019, légèrement décalées :
       l'œil suit une série à la fois plutôt que trois d'un coup. L'étiquette
       arrive quand son trait atteint son extrémité. */
    aEntree = function () {
      traces.forEach(function (p, i) { A.anim.tracer(p, 1200, i * 160); });
      A.anim.paraitre(etiquettes, 360, 1000);
    };

    viseur(svg, {
      vbW: VB2.w, n: L.length, gauche: VB2.ml, droite: VB2.ml + PW, haut: VB2.mt, bas: Y(0),
      series: series,
      aria: 'Nombre d\'agences par année. Flèches gauche et droite pour parcourir les années.',
      index: function (vx) {
        return Math.max(0, Math.min(L.length - 1, Math.round((vx - VB2.ml) / PW * (L.length - 1))));
      },
      point: function (i) {
        return { x: X(L[i].annee), ys: series.map(function (s) { return Y(L[i][s.cle] || 0); }) };
      },
      info: function (i) {
        var lignes = series.map(function (s) {
          return { nom: s.nom, valeur: L[i][s.cle] === null ? 'non renseigné' : A.fmt(L[i][s.cle]), couleur: s.couleur };
        });
        if (L[i].annee === 2014) {
          lignes.push({ nom: 'coopératives déclarées', valeur: A.fmt(L[i].coop_inst) + ' (rupture)' });
        }
        return { titre: String(L[i].annee), lignes: lignes };
      }
    });
  }

  A.flow = {
    maturite: maturite, agences: agences,
    entrerMaturite: function () { if (mEntree) mEntree(); },
    entrerAgences: function () { if (aEntree) aEntree(); }
  };
})(window.APP);
