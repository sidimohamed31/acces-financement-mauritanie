/* scene-blindspots.js — écran 4 : ce que les données ne disent pas.
 *
 * Correction apportée au brief : le PIB et l'encours n'ont pas le même
 * dénominateur. Les 41 % de résidu sont une part du CRÉDIT, pas du PIB —
 * les mettre dans la même figure serait une faute de lecture. Deux anneaux,
 * un par dénominateur, chacun sommant à 100 % de sa propre grandeur.
 *
 * Pourquoi des anneaux et non des disques pleins : l'anneau de l'encours n'a
 * que deux parts, et un camembert à deux parts ne dit rien qu'un nombre ne
 * dise mieux. Le centre porte donc le chiffre — c'est lui la figure, la
 * couronne ne fait que le situer dans son tout.
 *
 * --absent n'est jamais associé à --immerge ici : il est associé à --connu.
 */

(function (A) {
  'use strict';

  // Le viewBox est plus large que l'anneau : la couronne extérieure est réservée
  // aux étiquettes directes, pour que CHAQUE part soit nommée et chiffrée sur la
  // figure elle-même — et pas seulement celle mise en avant au centre.
  var VB = { w: 400, h: 300 };
  var CX = 200, CY = 142, R = 100, RI = 64, R_ETIQ = 112;

  // Rempli par init() : chaque anneau y dépose son balayage d'entrée, joué
  // quand la carte entre dans le champ et pas au chargement.
  var entrees = {};

  // Libellés de provenance, produits par le pipeline : aucun nom de fichier
  // n'est écrit ici, ils suivent DATA.meta.sources.
  var SRC = window.DATA.meta.sources;

  /* `sources` : les deux anneaux n'ont pas le même dénominateur, donc pas la
     même provenance — le PIB vient des comptes nationaux, l'encours du
     classeur de crédit. Chaque appel apporte la sienne. */
  function donut(hoteFig, hoteLeg, titre, total, segments, centre, sources) {
    var svg = A.scene(hoteFig, VB, titre,
      segments.map(function (s) {
        return s.nom + ' : ' + A.fmt(s.val) + ' MRU M, ' + A.pct(s.val / total);
      }).join(' ; '));

    var hach = A.hachures(svg, 'hach-' + titre.replace(/\W+/g, ''), 's-absent', 0.9);
    var ang = 0;
    var parts = [];   // pour le balayage d'entrée

    segments.forEach(function (s) {
      var part = s.val / total;
      var fin = ang + part * 360;
      var teinte = s.absent ? 'f-absent' : 'f-connu';
      var op = s.faible ? 0.34 : 1;
      var d = A.arc(CX, CY, R, RI, ang, fin);

      var g = A.el('g', null, svg);
      parts.push({ g: g, deb: ang, fin: fin });
      A.el('path', { d: d, class: teinte, opacity: s.absent ? 0.3 * op : 0.9 }, g);
      if (s.absent) {
        A.el('path', { d: d, fill: hach, opacity: op }, g);
        A.el('path', { d: d, fill: 'none', class: 's-absent', 'stroke-width': 1, opacity: op }, g);
      }
      // 2 px de respiration entre deux parts, dans la couleur de la surface
      A.el('path', { d: d, fill: 'none', class: 's-fond', 'stroke-width': 2 }, g);

      var hit = A.el('path', { d: d, class: 'hit', tabindex: 0, role: 'img' }, g);
      var halo = A.el('path', { d: d, class: 'surbrillance' }, g);
      hit.setAttribute('aria-label', s.nom + ' : ' + A.pct(part) + ', ' + A.fmt(s.val) + ' millions');
      A.survol(hit, function () {
        return {
          titre: s.nom,
          lignes: [
            { nom: 'part du total', valeur: A.pct(part), couleur: s.absent ? '--absent' : '--connu' },
            { nom: 'montant', valeur: A.mru(s.val) },
            { nom: 'total', valeur: A.mru(total) }
          ],
          sources: sources
        };
      });
      void halo;

      /* Étiquette directe posée hors de l'anneau, sur le fond de page : la
         lisibilité ne dépend alors ni de l'aplat ni des hachures, dans les deux
         thèmes. Le côté détermine l'ancrage, sinon le texte rentre dans le disque. */
      var med = (ang + fin) / 2;
      var t = (med - 90) * Math.PI / 180;
      var lx = CX + R_ETIQ * Math.cos(t), ly = CY + R_ETIQ * Math.sin(t);
      var lat = Math.sin(med * Math.PI / 180);
      var anc = lat > 0.25 ? 'start' : lat < -0.25 ? 'end' : 'middle';

      A.el('text', {
        x: lx.toFixed(1), y: (ly - 4).toFixed(1), 'text-anchor': anc,
        class: 'axe', 'font-size': 11, text: s.court
      }, svg);
      A.el('text', {
        x: lx.toFixed(1), y: (ly + 11).toFixed(1), 'text-anchor': anc,
        class: 'val ' + (s.absent ? 'f-absent' : 'f-sable'),
        'font-size': 13, 'font-weight': 500, opacity: s.faible ? 0.75 : 1,
        text: A.pct(part)
      }, svg);

      ang = fin;
    });

    /* Le nombre est la figure : la couronne ne fait que le situer.
       font-size passe par le style et non par l'attribut de présentation :
       une règle CSS de classe (.val, .axe) l'emporte toujours sur l'attribut,
       si bien que ce 28 se rendait en 12 et que le chiffre central était
       réduit à la taille d'une étiquette. */
    A.el('text', {
      x: CX, y: CY - 2, 'text-anchor': 'middle', class: 'val f-absent',
      style: 'font-size:28px;font-weight:500', text: centre.valeur
    }, svg);
    // Le trou mesure 128 unités de large, moins à mesure qu'on s'en écarte :
    // à 16 unités sous le centre il en reste 124, et la légende y tient.
    A.el('text', {
      x: CX, y: CY + 16, 'text-anchor': 'middle', class: 'axe',
      style: 'font-size:10px', text: centre.libelle
    }, svg);

    /* Balayage d'entrée : l'anneau se referme depuis midi, dans le sens de la
       lecture. Un chemin d'arc ne se transitionne pas en CSS — c'est sa
       définition qui change — donc on repasse par une boucle d'images.
       Tous les tracés d'une part (aplat, hachure, filet, cible) partagent le
       même d : les mettre à jour ensemble garde la part cohérente. */
    var balayer = function (p) {
      parts.forEach(function (q) {
        var f = Math.max(q.deb, Math.min(q.fin, p * 360));
        var d = (f - q.deb) < 0.05 ? 'M0 0' : A.arc(CX, CY, R, RI, q.deb, f);
        [].forEach.call(q.g.querySelectorAll('path'), function (n) {
          n.setAttribute('d', d);
        });
      });
    };
    var textes = [].slice.call(svg.querySelectorAll('text'));

    /* Légende : obligatoire dès deux parts, et chaque part porte sa valeur. */
    segments.forEach(function (s) {
      var li = document.createElement('li');

      var puce = document.createElement('span');
      // La pastille doit ressembler à la part qu'elle désigne : sur la couronne
      // un angle mort est hachuré, pas plein. En monochrome c'est la hachure,
      // et non plus la teinte, qui porte l'identité — la légende doit la montrer.
      puce.className = s.absent ? 'puce puce-hach' : 'puce';
      if (!s.absent) puce.style.background = 'var(--connu)';
      puce.style.opacity = s.faible ? '0.45' : '1';
      li.appendChild(puce);

      var bloc = document.createElement('span');
      bloc.className = 'nom-part';
      bloc.appendChild(document.createTextNode(s.nom));
      var mru = document.createElement('span');
      mru.className = 'mru';
      mru.textContent = A.mru(s.val);
      bloc.appendChild(mru);
      li.appendChild(bloc);

      var part = document.createElement('span');
      part.className = 'part';
      part.style.color = 'var(' + (s.absent ? '--absent' : '--brume') + ')';
      part.textContent = A.pct(s.val / total);
      li.appendChild(part);

      hoteLeg.appendChild(li);
    });

    return function () {
      if (A.anim.sobre()) return;
      A.anim.progresser(1000, balayer);
      A.anim.paraitre(textes.concat([].slice.call(hoteLeg.children)), 420, 620);
    };
  }

  function init(fig1, leg1, fig2, leg2, hostTable) {
    var c = window.DATA.couverture, cr = window.DATA.credit;
    var autres = c.non_couvert - c.agro_pastoral;

    // `court` : l'étiquette portée par la figure elle-même. Le nom complet reste en
    // légende — « administration, santé, enseignement, énergie » ne tient pas sur un anneau.
    entrees.pib = donut(fig1, leg1, 'Couverture du PIB par la nomenclature du crédit', c.pib_cout_facteurs, [
      { nom: 'branches ayant un poste de crédit', court: 'couvert', val: c.couvert },
      { nom: 'agro-pastoral', court: 'agro-pastoral', val: c.agro_pastoral, absent: true },
      { nom: 'administration, santé, enseignement, énergie', court: 'autres',
        val: autres, absent: true, faible: true }
    // Le centre AGRÈGE, la couronne DÉCOMPOSE : il porte le total non couvert,
    // que l'anneau ne montre que scindé en deux parts. Répéter une part déjà
    // étiquetée juste à côté n'apprendrait rien. Il doit tenir dans le trou (128 px).
    ], { valeur: A.pct(c.non_couvert / c.pib_cout_facteurs), libelle: 'sans correspondance' },
       [SRC.va]);

    entrees.credit = donut(fig2, leg2, 'Ventilation de l\'encours bancaire', cr.total, [
      { nom: 'ventilé par secteur', court: 'ventilé', val: cr.ventile },
      { nom: '« consommation et autres », non ventilé', court: 'non ventilé',
        val: cr.residu, absent: true }
    // Ici la couronne donne déjà les pourcentages : le centre apporte le montant.
    ], { valeur: A.fmt(cr.residu), libelle: 'MRU M non ventilés' },
       [SRC.credit]);

    /* --- table de correspondance, branches orphelines en clair ------------ */
    var tb = document.createElement('tbody');
    window.DATA.mapping.forEach(function (m) {
      var tr = document.createElement('tr');
      var a = document.createElement('td'); a.textContent = m.poste;
      var b = document.createElement('td'); b.textContent = m.branches.join(', ');
      tr.appendChild(a); tr.appendChild(b);
      tb.appendChild(tr);
    });
    var tr = document.createElement('tr');
    tr.className = 'orphelin';
    var a = document.createElement('td'); a.textContent = 'aucun poste';
    var b = document.createElement('td');
    b.textContent = c.branches_non_couvertes.map(function (x) { return x.nom; }).join(', ');
    tr.appendChild(a); tr.appendChild(b);
    tb.appendChild(tr);
    hostTable.appendChild(tb);
  }

  A.blindspots = { init: init, entrees: entrees };
})(window.APP);
