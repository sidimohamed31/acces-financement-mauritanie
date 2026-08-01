/* scene-gap.js — écran 2 : les écarts en millions + courbe de Lorenz croisée.
 *
 * Barres divergentes, PAS une cascade. Dans un diagramme en cascade chaque barre
 * flotte sur le cumul de la précédente : la Pêche (+3 193) se retrouvait plus haut
 * que le BTP (+5 767) tout en valant moins, parce que la position y encode le cumul
 * et la longueur la valeur. Deux grandeurs sur un même axe, et l'œil lit la mauvaise.
 *
 * Ici toutes les barres partent d'UNE SEULE ligne de base — le zéro — et l'échelle
 * est symétrique : deux écarts de même ampleur ont exactement la même longueur, quel
 * que soit leur signe. C'est la forme que demande « écart au-dessus / en dessous
 * d'une référence ».
 *
 * La somme nulle, elle, n'est plus portée par la géométrie mais par les deux totaux
 * affichés sous le graphique : les gonfler en barres aurait écrasé l'échelle.
 */

(function (A) {
  'use strict';

  // viewBox calé sur la largeur de rendu réelle d'une demi-carte : à 1000 unités
  // affichées dans ~600 px, un libellé de 13 unités tombait à 8 px.
  var VB = { w: 700, h: 400, ml: 62, mr: 18, mt: 36, mb: 58 };
  var PW = VB.w - VB.ml - VB.mr;
  var PH = VB.h - VB.mt - VB.mb;
  var Y0 = VB.mt + PH / 2;

  var svg, noeuds = {}, yMax = 1, totaux;

  function borne() {
    // Échelle FIXE et SYMÉTRIQUE sur tous les scénarios : les bascules doivent être
    // comparables, et +6 000 doit mesurer autant que −6 000.
    var mx = 0;
    Object.keys(window.DATA.scenarios).forEach(function (k) {
      window.DATA.scenarios[k].secteurs.forEach(function (s) {
        if (Math.abs(s.ecart) > mx) mx = Math.abs(s.ecart);
      });
    });
    return Math.ceil(mx / 2000) * 2000;
  }

  var y = function (v) { return Y0 - (v / yMax) * (PH / 2); };

  function init(host, hoteTotaux) {
    yMax = borne();
    totaux = hoteTotaux;

    svg = A.scene(host, VB, 'Écart de crédit par secteur, en millions de MRU',
      'Barres divergentes autour de zéro : vers le haut les secteurs qui reçoivent plus ' +
      'de crédit que leur poids économique, vers le bas ceux qui en reçoivent moins. ' +
      'Toutes partent de la même ligne de base, les longueurs sont donc comparables.');

    for (var v = -yMax; v <= yMax; v += yMax / 2) {
      if (v === 0) continue;
      A.el('line', { x1: VB.ml, x2: VB.ml + PW, y1: y(v), y2: y(v), class: 'grille-l', opacity: 0.4 }, svg);
      A.el('text', {
        x: VB.ml - 12, y: y(v) + 4, class: 'axe', 'text-anchor': 'end', text: A.signe(v)
      }, svg);
    }

    var couche = A.el('g', null, svg);
    window.DATA.credit.postes.forEach(function (p) {
      var g = A.el('g', { class: 'moveable' }, couche);
      var n = {
        g: g,
        barre: A.el('rect', { class: 'mark', x: 0, rx: 3, 'stroke-width': 1.2 }, g),
        val: A.el('text', { class: 'val', 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 500 }, g),
        nom: A.el('text', { class: 'nom', 'text-anchor': 'middle', y: VB.mt + PH + 26 }, g),
        hit: A.el('rect', { class: 'hit', tabindex: 0, role: 'img' }, g)
      };
      n.halo = A.el('rect', { class: 'surbrillance', rx: 3 }, g);
      noeuds[p.id] = n;

      A.survol(n.hit, function () {
        var s = n.data;
        if (!s) return null;
        return {
          titre: s.nom,
          lignes: [
            { nom: 'crédit reçu', valeur: A.mru(s.credit) },
            { nom: 'crédit à parité', valeur: A.mru(s.credit - s.ecart) },
            { nom: 'écart', valeur: A.signe(s.ecart_aff) + A.NBSP + 'MRU M',
              couleur: s.ecart >= 0 ? '--emerge' : '--immerge' },
            { nom: 'indice (IFR)', valeur: A.fmt(s.ifr, 2) }
          ]
        };
      });
    });

    // la ligne de base : une seule, commune à toutes les barres
    A.el('line', {
      x1: VB.ml, x2: VB.ml + PW, y1: Y0, y2: Y0, class: 's-emerge', 'stroke-width': 1.5
    }, svg);
    A.el('text', {
      x: VB.ml - 12, y: Y0 + 4, class: 'axe f-emerge', 'text-anchor': 'end', text: '0'
    }, svg);
    A.el('text', {
      x: VB.ml + PW, y: VB.mt - 12, class: 'axe', 'text-anchor': 'end',
      text: 'écart en millions de MRU'
    }, svg);
  }

  function update(sc) {
    var n = sc.secteurs.length;
    var pas = PW / n;
    var lg = Math.min(pas * 0.42, 78);
    var pos = 0, neg = 0;

    sc.secteurs.forEach(function (s, i) {
      var d = noeuds[s.id];
      var x = VB.ml + i * pas + (pas - lg) / 2;
      var haut = s.ecart >= 0;
      d.data = s;
      if (haut) pos += s.ecart_aff; else neg += s.ecart_aff;

      d.g.setAttribute('transform', 'translate(' + x.toFixed(2) + ',0)');
      d.barre.setAttribute('width', lg.toFixed(2));
      d.barre.setAttribute('y', (haut ? y(s.ecart) : Y0).toFixed(2));
      d.barre.setAttribute('height', Math.max(1, Math.abs(y(s.ecart) - Y0)).toFixed(2));
      d.barre.setAttribute('class', 'mark s-immerge ' + (haut ? 'f-aplat' : 'f-immerge'));

      d.halo.setAttribute('x', 0);
      d.halo.setAttribute('width', lg.toFixed(2));
      d.halo.setAttribute('y', (haut ? y(s.ecart) : Y0).toFixed(2));
      d.halo.setAttribute('height', Math.max(1, Math.abs(y(s.ecart) - Y0)).toFixed(2));

      d.hit.setAttribute('x', (-(pas - lg) / 2).toFixed(2));
      d.hit.setAttribute('width', pas.toFixed(2));
      d.hit.setAttribute('y', VB.mt);
      d.hit.setAttribute('height', PH.toFixed(2));
      d.hit.setAttribute('aria-label', s.nom + ' : écart ' + A.signe(s.ecart_aff) +
        ' millions de MRU, indice ' + A.fmt(s.ifr, 2));

      // valeur à l'extrémité libre de la barre, jamais du côté de la ligne de base
      d.val.setAttribute('x', lg / 2);
      d.val.setAttribute('y', (haut ? y(s.ecart) - 10 : y(s.ecart) + 18).toFixed(2));
      d.val.setAttribute('class', 'val ' + (haut ? 'f-emerge' : 'f-immerge'));
      d.val.textContent = A.signe(s.ecart_aff);

      d.nom.setAttribute('x', lg / 2);
      d.nom.textContent = s.nom;
    });

    svg._desc.textContent = sc.secteurs.map(function (s) {
      return s.nom + ' ' + A.signe(s.ecart_aff) + ' MRU M';
    }).join(' ; ') + '. Somme nulle.';

    if (totaux) {
      totaux.textContent = '';
      var ex = document.createElement('strong');
      ex.className = 'n';
      ex.textContent = A.signe(pos) + A.NBSP + 'MRU M';
      var de = document.createElement('strong');
      de.className = 'n';
      de.textContent = A.signe(neg) + A.NBSP + 'MRU M';
      totaux.appendChild(document.createTextNode('Les excédents totalisent '));
      totaux.appendChild(ex);
      totaux.appendChild(document.createTextNode(', les déficits '));
      totaux.appendChild(de);
      totaux.appendChild(document.createTextNode(
        ' : exactement la même somme, au million près. Ce qu\'un secteur reçoit en trop, ' +
        'un autre ne l\'a pas.'));
    }

    lorenz(sc);
  }

  /* --------------------------------------------------------------- Lorenz -- */

  // ml doit loger le titre d'axe pivoté ET les graduations : à 46, « 100 % »
  // remontait sur « part cumulée du crédit ».
  var LB = { w: 340, h: 300, ml: 64, mb: 42, mr: 14, mt: 14 };
  var lsvg, lcourbe, lzone, lpoints, lindice;

  function initLorenz(host, hostIndice) {
    lindice = hostIndice;
    lsvg = A.scene(host, LB, 'Courbe de Lorenz croisée',
      'Part cumulée de la valeur ajoutée en abscisse, part cumulée du crédit en ordonnée. ' +
      'La diagonale figure une allocation qui suivrait exactement le poids économique.');

    var x0 = LB.ml, y0 = LB.h - LB.mb, x1 = LB.w - LB.mr, y1 = LB.mt;

    A.el('rect', { x: x0, y: y1, width: x1 - x0, height: y0 - y1, fill: 'none', class: 's-trait' }, lsvg);
    lzone = A.el('path', { class: 'f-immerge', opacity: 0.22 }, lsvg);
    A.el('line', { x1: x0, y1: y0, x2: x1, y2: y1, class: 's-brume', 'stroke-width': 1, 'stroke-dasharray': '4 4' }, lsvg);
    lcourbe = A.el('path', { fill: 'none', class: 's-immerge', 'stroke-width': 2, 'stroke-linejoin': 'round' }, lsvg);
    lpoints = A.el('g', null, lsvg);

    A.el('text', { x: (x0 + x1) / 2, y: LB.h - 8, class: 'axe', 'text-anchor': 'middle', 'font-size': 11, text: 'part cumulée de la VA' }, lsvg);
    A.el('text', { x: 14, y: (y0 + y1) / 2, class: 'axe', 'text-anchor': 'middle', 'font-size': 11, transform: 'rotate(-90 14 ' + ((y0 + y1) / 2) + ')', text: 'part cumulée du crédit' }, lsvg);
    [0, 0.5, 1].forEach(function (f) {
      A.el('text', { x: x0 - 8, y: y0 - f * (y0 - y1) + 4, class: 'axe', 'text-anchor': 'end', 'font-size': 10, text: A.pct(f, 0) }, lsvg);
      A.el('text', { x: x0 + f * (x1 - x0), y: y0 + 18, class: 'axe', 'text-anchor': 'middle', 'font-size': 10, text: A.pct(f, 0) }, lsvg);
    });
  }

  function lorenz(sc) {
    var x0 = LB.ml, y0 = LB.h - LB.mb, x1 = LB.w - LB.mr, y1 = LB.mt;
    var X = function (f) { return x0 + f * (x1 - x0); };
    var Y = function (f) { return y0 - f * (y0 - y1); };

    var tri = sc.secteurs.slice().sort(function (a, b) { return a.ifr - b.ifr; });
    var cv = 0, cc = 0, pts = [[X(0), Y(0)]], surplus = 0, cumuls = [];
    tri.forEach(function (s) {
      cv += s.part_va; cc += s.part_credit;
      pts.push([X(cv), Y(cc)]);
      cumuls.push({ s: s, va: cv, cr: cc });
      if (s.ecart > 0) surplus += s.ecart;
    });

    lcourbe.setAttribute('d', A.chemin(pts));
    lzone.setAttribute('d', A.chemin(pts) + ' L' + X(1) + ' ' + Y(1) + ' Z');

    while (lpoints.firstChild) lpoints.removeChild(lpoints.firstChild);
    pts.slice(1).forEach(function (p, i) {
      var c = cumuls[i];
      A.el('circle', { cx: p[0], cy: p[1], r: 2.6, class: 'f-immerge' }, lpoints);
      // cible transparente de 12 px : un point de 2,6 px ne s'attrape pas
      var hit = A.el('circle', { cx: p[0], cy: p[1], r: 12, class: 'hit', tabindex: 0, role: 'img' }, lpoints);
      hit.setAttribute('aria-label', 'Cumul jusqu\'à ' + c.s.nom + ' : ' +
        A.pct(c.va) + ' de la valeur ajoutée, ' + A.pct(c.cr) + ' du crédit');
      A.survol(hit, function () {
        return {
          titre: 'Cumul jusqu\'à ' + c.s.nom,
          lignes: [
            { nom: 'part de la VA', valeur: A.pct(c.va) },
            { nom: 'part du crédit', valeur: A.pct(c.cr), couleur: '--immerge' },
            { nom: 'manque', valeur: A.pct(c.va - c.cr) }
          ]
        };
      });
    });

    // Indice de dissimilarité : part de l'encours ventilé qu'il faudrait déplacer.
    // Désormais porté par la ligne de lecture de la carte ; l'hôte est optionnel.
    if (lindice) lindice.textContent = A.pct(surplus / sc.base_credit);
  }

  /* --------------------------------------------------------------- entrée --
     Les barres poussent depuis la ligne du zéro, dans l'ordre de la lecture.
     On repose l'état de départ SANS la classe .mark — donc sans transition —
     puis on force un reflow avant de rendre les vraies valeurs : c'est ce
     reflow qui fait de l'état plat un point de départ et non un saut. */

  function entrer(sc) {
    if (!svg || A.anim.sobre()) { if (sc) update(sc); return; }
    var dec = parseFloat(A.lireVar('--decalage')) || 0;
    var ids = sc.secteurs.map(function (s) { return s.id; });

    ids.forEach(function (id) {
      var n = noeuds[id];
      n.barre.classList.remove('mark');
      n.barre.setAttribute('y', Y0.toFixed(2));
      n.barre.setAttribute('height', 0);
    });
    svg.getBoundingClientRect();

    /* .mark doit être REPOSÉE avant update() : celui-ci écrit la hauteur avant
       de réécrire la classe, donc sans elle la barre sauterait à sa valeur et
       la classe n'arriverait qu'après, trop tard pour animer quoi que ce soit. */
    ids.forEach(function (id, i) {
      noeuds[id].barre.classList.add('mark');
      noeuds[id].barre.style.transitionDelay = (i * dec) + 'ms';
    });
    update(sc);
    A.anim.paraitre(ids.map(function (id) { return noeuds[id].val; }), 300, 240);

    // Les délais ne valent que pour l'entrée : les bascules restent simultanées.
    setTimeout(function () {
      ids.forEach(function (id) { noeuds[id].barre.style.transitionDelay = ''; });
    }, ids.length * dec + 700);
  }

  // La courbe se dessine, sa zone et ses points suivent une fois le trait posé.
  function entrerLorenz() {
    if (!lsvg) return;
    A.anim.tracer(lcourbe, 1100);
    A.anim.paraitre([lzone, lpoints], 420, 520);
  }

  A.gap = { init: init, update: update, initLorenz: initLorenz,
            entrer: entrer, entrerLorenz: entrerLorenz };
})(window.APP);
