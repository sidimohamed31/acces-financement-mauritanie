/* scene-waterline.js — écran 1, le graphique de flottaison (élément signature).
 *
 * Encodage :
 *   épaisseur de la barre = part du secteur dans la valeur ajoutée
 *   longueur de la barre  = IFR (part du crédit / part de la VA)
 *   ligne de parité       = IFR 1
 *
 * Donc aire = épaisseur x longueur ∝ part_va x (part_credit / part_va) = part_credit,
 * et l'aire comprise entre le bout de la barre et la ligne est exactement
 * proportionnelle à l'écart en MRU M. La géométrie porte l'arithmétique.
 *
 * Deux dispositions : colonnes verticales par défaut, barres horizontales en
 * dessous de 640 px — sous cette largeur, un libellé vertical devient illisible.
 */

(function (A) {
  'use strict';

  var IFR_MAX = 2.8;   // échelle FIXE : sinon les bascules ne comparent rien
  var GAP = 3;

  // Carte pleine largeur : viewBox calé sur la largeur de rendu (~1480 px), pour
  // que les libellés y aient la même taille apparente que dans les demi-cartes.
  var VBV = { w: 1400, h: 400, ml: 58, mr: 24, mt: 48, mb: 64 };
  var VBH = { w: 420, h: 560, ml: 92, mr: 66, mt: 28, mb: 38 };

  var hote, svg, noeuds, hachure, horizontal, dernier;
  var mq = window.matchMedia('(max-width: 640px)');

  /* ------------------------------------------------------------ construction -- */

  function construire() {
    while (hote.firstChild && hote.firstChild.tagName !== 'FIGCAPTION') {
      hote.removeChild(hote.firstChild);
    }
    noeuds = {};
    horizontal = mq.matches;
    var VB = horizontal ? VBH : VBV;

    svg = A.scene(hote, VB, 'Graphique de flottaison',
      'Barres à taille variable : l\'épaisseur donne le poids du secteur dans la ' +
      'valeur ajoutée, la longueur son indice de financement relatif. La ligne de ' +
      'parité marque le point où le crédit reçu épouse exactement le poids économique.');

    // Le crédit manquant est la seule chose colorée du tableau de bord : il
    // n'existe que sur cet écran, donc l'accent ne peut rien contredire ailleurs.
    hachure = A.hachures(svg, 'hach-flot', 's-accent', 0.85);

    (horizontal ? grilleH : grilleV)(VB);

    var couche = A.el('g', null, svg);
    window.DATA.credit.postes.forEach(function (p) {
      var g = A.el('g', { class: 'moveable' }, couche);
      var n = {
        g: g,
        manque: A.el('rect', { class: 'mark', fill: hachure }, g),
        // Le filet est posé une fois pour toutes : au-dessus de la parité il
        // porte à lui seul la visibilité de l'aplat pâle, en dessous il se
        // confond avec le noir plein et ne coûte rien.
        barre: A.el('rect', { class: 'mark', rx: 3, 'stroke-width': 1.2 }, g),
        ifr: A.el('text', { class: 'val', 'font-weight': 500 }, g),
        ecart: A.el('text', { class: 'val f-brume' }, g),
        nom: A.el('text', { class: 'nom' }, g),
        part: A.el('text', { class: 'axe' }, g),
        // zone de saisie plus large que la marque, focalisable au clavier
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
            { nom: 'part de la VA', valeur: A.pct(s.part_va) },
            { nom: 'part du crédit', valeur: A.pct(s.part_credit) },
            { nom: 'indice (IFR)', valeur: A.fmt(s.ifr, 2), couleur: s.ifr >= 1 ? '--emerge' : '--immerge' },
            { nom: 'écart', valeur: A.signe(s.ecart_aff) + A.NBSP + 'MRU M' }
          ]
        };
      });
    });

    (horizontal ? pariteH : pariteV)(VB);

    // La légende nomme la dimension réellement employée par la disposition.
    var cap = hote.querySelector('figcaption');
    if (cap) {
      cap.textContent = (horizontal
        ? 'Épaisseur des barres : part du secteur dans la valeur ajoutée. Longueur : indice de financement relatif. '
        : 'Largeur des colonnes : part du secteur dans la valeur ajoutée. Hauteur : indice de financement relatif. ')
        + 'La zone hachurée est le crédit qui manquerait pour atteindre la parité, '
        + 'sur ' + A.mru(window.DATA.credit.ventile) + ' ventilés.';
    }
  }

  /* ------------------------------------------------------- repères, vertical -- */

  function yV(v) {
    return VBV.mt + (VBV.h - VBV.mt - VBV.mb) * (1 - v / IFR_MAX);
  }

  function grilleV(VB) {
    [0, 0.5, 1.5, 2, 2.5].forEach(function (v) {
      A.el('line', { x1: VB.ml, x2: VB.w - VB.mr, y1: yV(v), y2: yV(v), class: 'grille-l', opacity: v === 0 ? 0.9 : 0.45 }, svg);
      A.el('text', { x: VB.ml - 12, y: yV(v) + 4, class: 'axe', 'text-anchor': 'end', text: v.toFixed(1).replace('.', ',') }, svg);
    });
    A.el('text', { x: VB.ml - 12, y: VB.mt - 24, class: 'axe', 'text-anchor': 'end', text: 'IFR' }, svg);
  }

  function pariteV(VB) {
    A.el('line', { x1: VB.ml, x2: VB.w - VB.mr, y1: yV(1), y2: yV(1), class: 'ligne-parite' }, svg);
    A.el('text', {
      x: VB.w - VB.mr, y: yV(1) - 10, 'text-anchor': 'end',
      'font-size': 12, class: 'val f-accent', text: 'parité — IFR 1,00'
    }, svg);
  }

  /* ----------------------------------------------------- repères, horizontal -- */

  function xH(v) {
    return VBH.ml + (VBH.w - VBH.ml - VBH.mr) * (v / IFR_MAX);
  }

  function grilleH(VB) {
    [0, 1, 2].forEach(function (v) {
      A.el('line', { x1: xH(v), x2: xH(v), y1: VB.mt, y2: VB.h - VB.mb, class: 'grille-l', opacity: v === 0 ? 0.9 : 0.45 }, svg);
      A.el('text', { x: xH(v), y: VB.h - VB.mb + 22, class: 'axe', 'font-size': 13, 'text-anchor': 'middle', text: A.fmt(v, 1) }, svg);
    });
    A.el('text', { x: xH(0), y: VB.mt - 12, class: 'axe', 'font-size': 13, 'text-anchor': 'start', text: 'IFR' }, svg);
  }

  function pariteH(VB) {
    A.el('line', { x1: xH(1), x2: xH(1), y1: VB.mt, y2: VB.h - VB.mb, class: 'ligne-parite' }, svg);
    A.el('text', {
      x: xH(1), y: VB.mt - 12, 'text-anchor': 'middle',
      'font-size': 13, class: 'val f-accent', text: 'parité'
    }, svg);
  }

  /* ----------------------------------------------------------------- rendus -- */

  function rendreV(sc) {
    var x = VBV.ml, PW = VBV.w - VBV.ml - VBV.mr;

    sc.secteurs.forEach(function (s) {
      var n = noeuds[s.id];
      n.data = s;
      var w = Math.max(2, s.part_va * PW - GAP);
      var haut = s.ifr >= 1, yb = yV(Math.min(s.ifr, IFR_MAX)), cx = w / 2;

      n.g.setAttribute('transform', 'translate(' + x.toFixed(2) + ',0)');
      set(n.barre, { x: 0, width: w, y: yb, height: Math.max(0, yV(0) - yb) });
      teinte(n.barre, 'mark s-immerge', haut ? 'f-aplat' : 'f-immerge');
      set(n.manque, { x: 0, width: w, y: haut ? yb : yV(1), height: haut ? 0 : Math.max(0, yb - yV(1)) });

      // la zone de saisie couvre toute la colonne, de la base au sommet du manque
      var hautZone = Math.min(yb, yV(1));
      set(n.hit, { x: 0, width: w, y: VBV.mt, height: yV(0) - VBV.mt });
      set(n.halo, { x: 0, width: w, y: hautZone, height: yV(0) - hautZone });
      n.hit.setAttribute('aria-label', s.nom + ' : indice ' + A.fmt(s.ifr, 2) +
        ', part de la VA ' + A.pct(s.part_va) + ', part du crédit ' + A.pct(s.part_credit) +
        ', écart ' + A.signe(s.ecart_aff) + ' millions');

      /* Au-dessus de la barre quand elle dépasse la parité. En dessous, l'espace
         libre est la zone hachurée : y poser du texte en --immerge le rendrait
         illisible sur ses propres hachures. On l'écrit donc DANS la barre, dans
         la couleur du fond — contraste vérifié dans les deux thèmes (4,1:1 et
         6,3:1). Repli au-dessus de la ligne si la barre est trop courte. */
      var dedans = !haut && (yV(0) - yb) >= 46;
      var yIfr = haut ? yb - 26 : dedans ? yb + 22 : yV(1) - 26;
      var yEc = haut ? yb - 10 : dedans ? yb + 38 : yV(1) - 10;
      var teint = haut ? 'f-emerge' : dedans ? 'f-fond' : 'f-immerge';

      set(n.ifr, { x: cx, y: yIfr, 'font-size': 21, 'text-anchor': 'middle' });
      teinte(n.ifr, 'val', teint);
      n.ifr.textContent = A.fmt(s.ifr, 2);
      set(n.ecart, { x: cx, y: yEc, 'font-size': 11.5, 'text-anchor': 'middle' });
      teinte(n.ecart, 'val', dedans ? 'f-fond' : 'f-brume');
      n.ecart.textContent = A.signe(s.ecart_aff) + A.NBSP + 'MRU M';
      set(n.nom, { x: cx, y: yV(0) + 24, 'font-size': 13, 'text-anchor': 'middle' });
      n.nom.textContent = s.nom;
      // « 8,5 % de la VA » déborderait sur la colonne voisine : l'unité est en légende.
      set(n.part, { x: cx, y: yV(0) + 42, 'font-size': 11, 'text-anchor': 'middle' });
      n.part.textContent = A.pct(s.part_va);

      x += s.part_va * PW;
    });
  }

  function rendreH(sc) {
    var y = VBH.mt, PH = VBH.h - VBH.mt - VBH.mb;

    sc.secteurs.forEach(function (s) {
      var n = noeuds[s.id];
      n.data = s;
      var h = Math.max(2, s.part_va * PH - GAP);
      var haut = s.ifr >= 1, xb = xH(Math.min(s.ifr, IFR_MAX)), cy = h / 2;

      n.g.setAttribute('transform', 'translate(0,' + y.toFixed(2) + ')');
      set(n.barre, { y: 0, height: h, x: xH(0), width: Math.max(0, xb - xH(0)) });
      teinte(n.barre, 'mark s-immerge', haut ? 'f-aplat' : 'f-immerge');
      set(n.manque, { y: 0, height: h, x: xb, width: haut ? 0 : Math.max(0, xH(1) - xb) });

      var finZone = Math.max(xb, xH(1));
      set(n.hit, { y: 0, height: h, x: VBH.ml - 90, width: (VBH.w - VBH.mr) - (VBH.ml - 90) });
      set(n.halo, { y: 0, height: h, x: xH(0), width: finZone - xH(0) });
      n.hit.setAttribute('aria-label', s.nom + ' : indice ' + A.fmt(s.ifr, 2) +
        ', part de la VA ' + A.pct(s.part_va) + ', part du crédit ' + A.pct(s.part_credit) +
        ', écart ' + A.signe(s.ecart_aff) + ' millions');

      // Posées après la zone hachurée, sinon les étiquettes d'un secteur
      // déficitaire se superposent aux hachures et à la ligne de parité.
      var xl = Math.max(xb, xH(1)) + 7;
      set(n.ifr, { x: xl, y: cy - 1, 'font-size': 16, 'text-anchor': 'start' });
      teinte(n.ifr, 'val', haut ? 'f-emerge' : 'f-immerge');
      n.ifr.textContent = A.fmt(s.ifr, 2);
      set(n.ecart, { x: xl, y: cy + 14, 'font-size': 10.5, 'text-anchor': 'start' });
      n.ecart.textContent = A.signe(s.ecart_aff);
      set(n.nom, { x: VBH.ml - 10, y: cy - 1, 'font-size': 14, 'text-anchor': 'end' });
      n.nom.textContent = s.nom;
      set(n.part, { x: VBH.ml - 10, y: cy + 14, 'font-size': 11, 'text-anchor': 'end' });
      n.part.textContent = A.pct(s.part_va);

      y += s.part_va * PH;
    });
  }

  function set(n, attrs) {
    for (var k in attrs) {
      n.setAttribute(k, typeof attrs[k] === 'number' ? attrs[k].toFixed(2) : attrs[k]);
    }
  }

  /* Repose la classe de teinte sans toucher aux classes de comportement. */
  function teinte(n, base, couleur) {
    n.setAttribute('class', base + ' ' + couleur);
  }

  /* ------------------------------------------------------------------ API -- */

  function init(host) {
    hote = host;
    construire();
    var relayout = function () {
      if (mq.matches === horizontal) return;
      construire();
      if (dernier) update(dernier);
    };
    if (mq.addEventListener) mq.addEventListener('change', relayout);
    else mq.addListener(relayout);
  }

  function update(sc) {
    dernier = sc;
    (horizontal ? rendreH : rendreV)(sc);
    svg._desc.textContent = sc.secteurs.map(function (s) {
      return s.nom + ' : indice ' + A.fmt(s.ifr, 2) + ', écart ' + A.signe(s.ecart_aff) + ' MRU M';
    }).join(' ; ') + '.';
  }

  /* Séquence d'entrée : les barres poussent depuis la ligne de base, décalées.
     C'est la seule animation d'arrivée de la page. Sous prefers-reduced-motion,
     --decalage vaut 0 et l'état final s'affiche d'un coup. */
  function entrer(sc) {
    var dec = parseFloat(A.lireVar('--decalage')) || 0;
    var ids = sc.secteurs.map(function (s) { return s.id; });

    ids.forEach(function (id) {
      var n = noeuds[id];
      n.g.style.opacity = '0';
      n.barre.classList.remove('mark');
      n.manque.classList.remove('mark');
      if (horizontal) {
        n.barre.setAttribute('width', 0); n.barre.setAttribute('x', xH(0));
        n.manque.setAttribute('width', 0);
      } else {
        n.barre.setAttribute('height', 0); n.barre.setAttribute('y', yV(0));
        n.manque.setAttribute('height', 0); n.manque.setAttribute('y', yV(0));
      }
    });

    svg.getBoundingClientRect();          // fige l'état initial avant transition

    ids.forEach(function (id, i) {
      var n = noeuds[id];
      n.barre.classList.add('mark');
      n.manque.classList.add('mark');
      var d = (i * dec) + 'ms';
      n.g.style.transitionDelay = d;
      n.barre.style.transitionDelay = d;
      n.manque.style.transitionDelay = d;
      n.g.style.opacity = '1';
    });

    update(sc);

    // Les délais ne valent que pour l'entrée : les bascules doivent être simultanées.
    setTimeout(function () {
      ids.forEach(function (id) {
        var n = noeuds[id];
        n.g.style.transitionDelay = '';
        n.barre.style.transitionDelay = '';
        n.manque.style.transitionDelay = '';
      });
    }, ids.length * dec + 700);
  }

  A.waterline = { init: init, update: update, entrer: entrer };
})(window.APP);
