/* lib.js — formatage et fabrication de SVG. Aucune donnée ici. */

window.APP = window.APP || {};

(function (A) {
  'use strict';

  var NNBSP = ' ';   // espace fine insécable : séparateur de milliers
  var NBSP  = ' ';   // espace insécable : devant %, avant l'unité
  var MOINS = '−';   // vrai signe moins, pas un trait d'union

  /* Fonction de formatage unique. Tout nombre affiché passe par ici. */
  function fmt(n, dec) {
    dec = dec || 0;
    var neg = n < 0;
    var s = Math.abs(n).toFixed(dec);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
    return (neg ? MOINS : '') + parts.join(',');
  }

  function signe(n, dec) {
    return (n > 0 ? '+' : n < 0 ? MOINS : '') + fmt(Math.abs(n), dec);
  }

  function pct(frac, dec) {
    return fmt(frac * 100, dec === undefined ? 1 : dec) + NBSP + '%';
  }

  function mru(n, dec) {
    return fmt(n, dec || 0) + NBSP + 'MRU M';
  }

  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs[k] === null || attrs[k] === undefined) continue;
        if (k === 'text') n.textContent = attrs[k];
        else n.setAttribute(k, attrs[k]);
      }
    }
    if (parent) parent.appendChild(n);
    return n;
  }

  /* Crée le <svg> accessible : role="img" + <title> + <desc> obligatoires. */
  function scene(host, vb, titre, desc) {
    // Inséré en tête : une <figcaption> écrite dans le HTML reste sous la figure.
    var s = el('svg', {
      viewBox: '0 0 ' + vb.w + ' ' + vb.h,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img'
    });
    host.insertBefore(s, host.firstChild);
    el('title', { text: titre }, s);
    var d = el('desc', { text: desc || '' }, s);
    s._desc = d;
    return s;
  }

  /* Hachures : encodage secondaire pour « donnée absente / manquante ».
     La couleur passe par une classe, pour suivre le thème sans redessiner. */
  function hachures(svg, id, klass, opacite) {
    var defs = el('defs', null, svg);
    var p = el('pattern', {
      id: id, width: 7, height: 7,
      patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)'
    }, defs);
    el('rect', { width: 7, height: 7, fill: 'transparent' }, p);
    el('line', {
      x1: 0, y1: 0, x2: 0, y2: 7, class: klass, 'stroke-width': 2.5,
      opacity: opacite === undefined ? 0.55 : opacite
    }, p);
    return 'url(#' + id + ')';
  }

  /* Arc de secteur circulaire (donut). Départ à midi, sens horaire. */
  function arc(cx, cy, rExt, rInt, deb, fin) {
    var p = function (r, a) {
      var t = (a - 90) * Math.PI / 180;
      return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
    };
    var grand = (fin - deb) > 180 ? 1 : 0;
    var a = p(rExt, deb), b = p(rExt, fin), c = p(rInt, fin), d = p(rInt, deb);
    return 'M' + a[0].toFixed(2) + ' ' + a[1].toFixed(2) +
      'A' + rExt + ' ' + rExt + ' 0 ' + grand + ' 1 ' + b[0].toFixed(2) + ' ' + b[1].toFixed(2) +
      'L' + c[0].toFixed(2) + ' ' + c[1].toFixed(2) +
      'A' + rInt + ' ' + rInt + ' 0 ' + grand + ' 0 ' + d[0].toFixed(2) + ' ' + d[1].toFixed(2) + 'Z';
  }

  function lireVar(nom) {
    return getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
  }

  /* Générateur de chemin polyligne. */
  function chemin(pts) {
    return pts.map(function (p, i) {
      return (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2);
    }).join(' ');
  }

  /* ------------------------------------------------------------ infobulle --
     L'infobulle enrichit, elle ne conditionne jamais : tout ce qu'elle montre
     reste lisible sans elle (étiquettes directes et table « voir les chiffres »).
     Mêmes informations au survol et au focus clavier.
     Les libellés sont insérés en textContent, jamais en innerHTML. */

  var boite;

  function bulleInit() {
    if (boite) return boite;
    boite = document.createElement('div');
    boite.id = 'infobulle';
    boite.setAttribute('role', 'status');
    boite.setAttribute('aria-live', 'polite');
    document.body.appendChild(boite);
    return boite;
  }

  /* titre : string ; lignes : [{nom, valeur, couleur?}]
     sources : [string] — les libellés viennent de DATA.meta.sources, produits
     par le pipeline. Aucun nom de fichier n'est retapé ici : si une source
     change dans les classeurs, l'infobulle suit sans qu'on y touche.
     Chaque libellé a la forme « Fichier.xlsx — précision ». */
  function bulleMontrer(titre, lignes, x, y, sources) {
    var b = bulleInit();
    b.textContent = '';

    var t = document.createElement('div');
    t.className = 'ti';
    t.textContent = titre;
    b.appendChild(t);

    var dl = document.createElement('dl');
    lignes.forEach(function (l) {
      var dt = document.createElement('dt');
      if (l.couleur) {
        var i = document.createElement('i');
        i.style.background = lireVar(l.couleur);
        dt.appendChild(i);
      }
      dt.appendChild(document.createTextNode(l.nom));
      var dd = document.createElement('dd');
      dd.textContent = l.valeur;
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    b.appendChild(dl);

    /* Provenance. Un chiffre sans son jeu de données est une affirmation :
       chaque infobulle nomme le ou les classeurs dont sa valeur est tirée. */
    if (sources && sources.length) {
      var s = document.createElement('div');
      s.className = 'prov';
      sources.forEach(function (txt) {
        var l = document.createElement('div');
        var coupe = String(txt).split(' — ');
        var f = document.createElement('b');
        f.textContent = coupe[0];
        l.appendChild(f);
        if (coupe[1]) l.appendChild(document.createTextNode(coupe[1]));
        s.appendChild(l);
      });
      b.appendChild(s);
    }

    b.classList.add('visible');
    bullePlacer(x, y);
    return b;
  }

  function bullePlacer(x, y) {
    if (!boite) return;
    var r = boite.getBoundingClientRect();
    var gx = x + 16, gy = y + 16;
    if (gx + r.width > window.innerWidth - 8) gx = x - r.width - 16;
    if (gy + r.height > window.innerHeight - 8) gy = y - r.height - 16;
    boite.style.left = Math.max(8, gx) + 'px';
    boite.style.top = Math.max(8, gy) + 'px';
  }

  function bulleCacher() {
    if (boite) boite.classList.remove('visible');
  }

  /* Câble une zone de saisie : survol, sortie, focus et défocus clavier. */
  function survol(cible, donne) {
    var maj = function (ev) {
      var r = cible.getBoundingClientRect();
      var x = ev && ev.clientX !== undefined ? ev.clientX : r.left + r.width / 2;
      var y = ev && ev.clientY !== undefined ? ev.clientY : r.top + r.height / 2;
      var d = donne(ev);
      if (!d) return bulleCacher();
      bulleMontrer(d.titre, d.lignes, x, y, d.sources);
    };
    cible.addEventListener('pointerenter', maj);
    cible.addEventListener('pointermove', maj);
    cible.addEventListener('pointerleave', bulleCacher);
    cible.addEventListener('focus', maj);
    cible.addEventListener('blur', bulleCacher);
  }

  /* ------------------------------------------------------------ animation --
     Cinq primitives, une seule règle : l'animation DÉCORE, elle ne porte
     jamais d'information. Sous prefers-reduced-motion tout se pose d'emblée
     à sa valeur finale, et l'image d'arrivée est toujours complète — un
     lecteur qui coupe le mouvement ne perd pas une donnée. */

  function sobre() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Sortie douce : vif au départ, la valeur s'installe à l'arrivée.
  function adoucir(t) { return 1 - Math.pow(1 - t, 3); }

  /* Compteur. Il part de la valeur qu'il affichait — 0 la première fois — et
     rejoint la nouvelle. Le formatage reste à l'appelant : le compteur n'a
     aucune idée de ce qu'il compte, indice, pourcentage ou milliards. */
  function nombre(el, vers, format, duree) {
    if (!el) return;
    var de = typeof el._val === 'number' ? el._val : 0;
    el._val = vers;
    if (el._raf) cancelAnimationFrame(el._raf);
    if (sobre() || de === vers) { el.textContent = format(vers); return; }
    var t0 = null, d = duree || 900;
    var pas = function (t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / d);
      el.textContent = format(de + (vers - de) * adoucir(p));
      if (p < 1) el._raf = requestAnimationFrame(pas);
    };
    el._raf = requestAnimationFrame(pas);
  }

  /* Tracé qui se dessine. Le trait est masqué par ses propres pointillés,
     puis on retire le décalage — il n'y a que dashoffset à animer. Le
     pointillé d'origine est rendu à la fin, sinon un trait tireté resterait
     plein pour toujours. */
  function tracer(path, duree, retard) {
    if (!path || sobre()) return;
    var L = path.getTotalLength();
    if (!L) return;
    var d = duree || 1100, r = retard || 0;
    var ancien = path.getAttribute('stroke-dasharray');
    path.style.transition = 'none';
    path.style.strokeDasharray = L + ' ' + L;
    path.style.strokeDashoffset = L;
    path.getBoundingClientRect();
    path.style.transition = 'stroke-dashoffset ' + d + 'ms ' + (lireVar('--courbe') || 'ease') + ' ' + r + 'ms';
    path.style.strokeDashoffset = '0';
    setTimeout(function () {
      path.style.transition = '';
      path.style.strokeDashoffset = '';
      path.style.strokeDasharray = ancien || '';
    }, d + r + 80);
  }

  /* Volet : un rectangle de découpe qui s'ouvre de gauche à droite. Sur une
     série temporelle, c'est le temps lui-même qui défile. Le clip est retiré
     à la fin — le laisser rognerait les étiquettes de bout de série. */
  function volet(svg, cibles, vb, duree) {
    if (!svg || sobre()) return;
    var d = duree || 1000;
    var id = 'volet-' + Math.random().toString(36).slice(2, 8);
    var cp = el('clipPath', { id: id }, el('defs', null, svg));
    var r = el('rect', { x: 0, y: 0, width: 0, height: vb.h }, cp);
    cibles.forEach(function (c) { c.setAttribute('clip-path', 'url(#' + id + ')'); });
    svg.getBoundingClientRect();
    r.style.transition = 'width ' + d + 'ms ' + (lireVar('--courbe') || 'ease');
    r.setAttribute('width', vb.w);
    setTimeout(function () {
      cibles.forEach(function (c) { c.removeAttribute('clip-path'); });
    }, d + 100);
  }

  /* Apparition simple, pour les étiquettes qui doivent suivre leur marque. */
  function paraitre(noeuds, duree, retard) {
    if (sobre()) return;
    var d = duree || 320, r = retard || 0;
    noeuds.forEach(function (n) {
      n.style.transition = 'none';
      n.style.opacity = '0';
    });
    if (noeuds[0]) noeuds[0].getBoundingClientRect();
    noeuds.forEach(function (n) {
      n.style.transition = 'opacity ' + d + 'ms linear ' + r + 'ms';
      n.style.opacity = '';
    });
    setTimeout(function () {
      noeuds.forEach(function (n) { n.style.transition = ''; });
    }, d + r + 80);
  }

  /* Pilote de progression, pour ce qui ne se transitionne pas en CSS —
     un balayage d'anneau, par exemple, où c'est le chemin qui change. */
  function progresser(duree, fn) {
    if (sobre()) { fn(1); return; }
    var t0 = null;
    var pas = function (t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / duree);
      fn(adoucir(p));
      if (p < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }

  /* Déclenche une entrée quand la figure entre dans le champ, une seule fois.
     Sans IntersectionObserver on joue tout de suite : mieux vaut une entrée
     manquée qu'une figure qui n'apparaît jamais. */
  function auRegard(hote, jouer) {
    if (!hote || !('IntersectionObserver' in window)) { jouer(); return; }
    var vu = false;
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting || vu) return;
        vu = true;
        io.disconnect();
        jouer();
      });
    }, { threshold: 0.2 });
    io.observe(hote);
  }

  A.anim = {
    sobre: sobre, nombre: nombre, tracer: tracer, volet: volet,
    paraitre: paraitre, progresser: progresser, auRegard: auRegard
  };

  A.bulle = { montrer: bulleMontrer, cacher: bulleCacher, placer: bullePlacer };
  A.survol = survol;
  A.arc = arc;
  A.fmt = fmt;
  A.signe = signe;
  A.pct = pct;
  A.mru = mru;
  A.el = el;
  A.scene = scene;
  A.hachures = hachures;
  A.lireVar = lireVar;
  A.chemin = chemin;
  A.NNBSP = NNBSP;
  A.NBSP = NBSP;
  A.MOINS = MOINS;
})(window.APP);
