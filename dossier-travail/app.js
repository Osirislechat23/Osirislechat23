'use strict';

/*
 * Dossier Travail — fiches de débit, analyse de fabrication et quincaillerie.
 * Application 100 % navigateur : les données sont enregistrées dans le
 * localStorage et exportées en CSV (Excel / Google Sheets) ou en JSON (sauvegarde).
 */
(() => {
  const STORE_KEY = 'dossierTravail.v1';

  const FIL = [['L', 'Longueur'], ['l', 'Largeur'], ['S', 'Sans']];
  const UNITES = ['u', 'paire', 'jeu', 'm', 'm²', 'boîte', 'kg', 'l'];

  const DEFAULT_SETTINGS = {
    tauxHoraire: 45,
    chute: 15,
    dernierAuteur: '',
    // Prix indicatifs : à ajuster dans Réglages avec vos tarifs fournisseurs.
    matieres: [
      { nom: 'Mélaminé blanc 19', ep: 19, longueur: 2800, largeur: 2070, prix: 55 },
      { nom: 'Mélaminé blanc 8', ep: 8, longueur: 2800, largeur: 2070, prix: 38 },
      { nom: 'MDF 19', ep: 19, longueur: 2440, largeur: 1220, prix: 32 },
      { nom: 'MDF 10', ep: 10, longueur: 2440, largeur: 1220, prix: 22 },
      { nom: 'MDF hydro 19', ep: 19, longueur: 2440, largeur: 1220, prix: 45 },
      { nom: 'Contreplaqué bouleau 18', ep: 18, longueur: 2500, largeur: 1250, prix: 95 },
      { nom: 'Stratifié compact 12', ep: 12, longueur: 3050, largeur: 1300, prix: 260 },
    ],
    operations: ['Débit', 'Placage de chants', 'Usinage CN', 'Perçage', 'Ponçage', 'Finition / vernis', 'Montage', 'Contrôle', 'Emballage', 'Livraison', 'Pose'],
    postes: ['Scie à panneaux', 'Plaqueuse de chants', 'Centre d\'usinage CN', 'Perceuse multiple', 'Établi', 'Cabine de finition', 'Chantier'],
    fournisseurs: ['Blum', 'Hettich', 'Häfele', 'Grass', 'Salice', 'Würth', 'Emuca', 'Richelieu'],
  };

  // ---------------------------------------------------------------- Données

  let db = load();

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) { /* stockage indisponible ou corrompu : on repart à zéro */ }
    return normalize({});
  }

  function normalize(d) {
    d = d && typeof d === 'object' ? d : {};
    d.projects = Array.isArray(d.projects) ? d.projects : [];
    d.settings = Object.assign(clone(DEFAULT_SETTINGS), d.settings || {});
    d.projects.forEach(p => normProject(p, d.settings));
    return d;
  }

  function normProject(p, settings = db.settings) {
    p.id = p.id || uid();
    p.chantier = p.chantier || '';
    p.date = p.date || today();
    p.auteur = p.auteur || '';
    p.debit = Array.isArray(p.debit) ? p.debit : [];
    p.gamme = Array.isArray(p.gamme) ? p.gamme : [];
    p.quinc = Array.isArray(p.quinc) ? p.quinc : [];
    p.panneaux = p.panneaux && typeof p.panneaux === 'object' ? p.panneaux : {};
    if (p.chute == null || p.chute === '') p.chute = settings.chute;
    if (p.tauxHoraire == null || p.tauxHoraire === '') p.tauxHoraire = settings.tauxHoraire;
    p.updatedAt = p.updatedAt || Date.now();
    return p;
  }

  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 250);
  }
  function saveNow() {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(db));
    } catch (e) {
      toast('Sauvegarde impossible : ' + e.message);
    }
  }
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

  function touch(p) { p.updatedAt = Date.now(); save(); }

  function getProject(id) { return db.projects.find(p => p.id === id); }

  function newProject() {
    const p = normProject({
      chantier: '',
      date: today(),
      auteur: db.settings.dernierAuteur || '',
      chute: db.settings.chute,
      tauxHoraire: db.settings.tauxHoraire,
    });
    db.projects.unshift(p);
    saveNow();
    return p;
  }

  function duplicateProject(p) {
    const c = clone(p);
    c.id = uid();
    c.chantier = (p.chantier || 'Projet') + ' (copie)';
    c.date = today();
    c.updatedAt = Date.now();
    db.projects.unshift(c);
    saveNow();
    return c;
  }

  // ---------------------------------------------------------------- Utilitaires

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function today() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function norm(s) { return String(s || '').trim().toLowerCase(); }

  /** Lit un nombre saisi à la française ("12,5", "1 250"). Renvoie NaN si vide. */
  function num(v) {
    if (typeof v === 'number') return v;
    if (v == null) return NaN;
    const s = String(v).replace(/[\s  ]/g, '').replace(',', '.');
    return s === '' ? NaN : parseFloat(s);
  }
  function n0(v) { const n = num(v); return Number.isFinite(n) ? n : 0; }

  function fmt(n, dec = 2) {
    return Number.isFinite(n) ? n.toLocaleString('fr-FR', { maximumFractionDigits: dec }) : '';
  }
  function euro(n) {
    return Number.isFinite(n) ? n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : '—';
  }
  function frDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return d && m && y ? `${d}/${m}/${y}` : iso;
  }

  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style') e.setAttribute('style', v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled') e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      e.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return e;
  }

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function slug(s) {
    return String(s || 'projet').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'projet';
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------------------------------------------------------------- Calculs

  function matiereByName(name) {
    const k = norm(name);
    return k ? db.settings.matieres.find(m => norm(m.nom) === k) : undefined;
  }

  function isEmptyDebitRow(r) {
    return !r.des && !r.matiere && !Number.isFinite(num(r.L)) && !Number.isFinite(num(r.l));
  }

  /** La pièce L×l rentre-t-elle dans le panneau, en respectant le sens du fil ? */
  function fits(L, l, fil, m) {
    const PL = n0(m.longueur), Pl = n0(m.largeur);
    if (!PL || !Pl) return true;
    const droit = L <= PL && l <= Pl;
    const tourne = L <= Pl && l <= PL;
    if (fil === 'L') return droit;
    if (fil === 'l') return tourne;
    return droit || tourne;
  }

  function surfacePiece(r) {
    const L = num(r.L), l = num(r.l);
    return Number.isFinite(L) && Number.isFinite(l) ? n0(r.qte) * L * l / 1e6 : NaN;
  }

  function analyseMatiere(p) {
    const groups = new Map();
    const warnings = [];
    for (const r of p.debit) {
      if (isEmptyDebitRow(r)) continue;
      const nom = (r.matiere || '').trim() || '(sans matière)';
      const key = norm(nom);
      let g = groups.get(key);
      if (!g) {
        g = { key, nom, mat: matiereByName(nom), pieces: 0, surface: 0, tropGrandes: [] };
        groups.set(key, g);
      }
      g.pieces += n0(r.qte);
      const L = num(r.L), l = num(r.l);
      const ref = r.rep || r.des || '?';
      if (Number.isFinite(L) && Number.isFinite(l)) {
        g.surface += n0(r.qte) * L * l / 1e6;
        if (g.mat && !fits(L, l, r.fil, g.mat)) g.tropGrandes.push(ref);
      } else {
        warnings.push(`Pièce « ${ref} » : longueur ou largeur manquante.`);
      }
      if (!n0(r.qte)) warnings.push(`Pièce « ${ref} » : quantité à 0.`);
    }

    const chute = n0(p.chute);
    const list = [...groups.values()].map(g => {
      const m = g.mat;
      const sp = m ? n0(m.longueur) * n0(m.largeur) / 1e6 : 0;
      const estim = sp > 0 ? Math.ceil(g.surface * (1 + chute / 100) / sp - 1e-9) : NaN;
      const force = num(p.panneaux[g.key]);
      const nb = Number.isFinite(force) ? force : estim;
      const prix = m ? num(m.prix) : NaN;
      const total = Number.isFinite(nb) && Number.isFinite(prix) ? nb * prix : NaN;
      if (!m) warnings.push(`Matière « ${g.nom} » absente du catalogue : ajoutez-la dans Réglages pour chiffrer les panneaux.`);
      else if (!Number.isFinite(prix)) warnings.push(`Matière « ${g.nom} » : prix du panneau non renseigné.`);
      if (g.tropGrandes.length) warnings.push(`Matière « ${g.nom} » : pièce(s) ${g.tropGrandes.join(', ')} plus grande(s) que le panneau (sens du fil compris).`);
      return Object.assign(g, { sp, estim, force, nb, prix, total });
    });
    return { list, warnings };
  }

  function costs(p) {
    const matiere = analyseMatiere(p).list.reduce((s, g) => s + (Number.isFinite(g.total) ? g.total : 0), 0);
    const quinc = p.quinc.reduce((s, r) => s + n0(r.qte) * n0(r.pu), 0);
    const heures = p.gamme.reduce((s, r) => s + n0(r.temps), 0);
    const mo = heures * n0(p.tauxHoraire);
    return { matiere, quinc, heures, mo, total: matiere + quinc + mo };
  }

  /** Mémoire des articles de quincaillerie déjà saisis (tous projets confondus). */
  function quincHistory() {
    const map = new Map();
    const projects = [...db.projects].sort((a, b) => a.updatedAt - b.updatedAt);
    for (const p of projects) {
      for (const r of p.quinc) {
        if (r.des) map.set(norm(r.des), r);
      }
    }
    return map;
  }

  // ---------------------------------------------------------------- Grille de saisie

  /**
   * Éditeur de lignes : tableau sur ordinateur, fiches empilées sur téléphone.
   * `Entrée` passe à la ligne suivante (et en crée une si besoin).
   */
  function rowEditor({ cols, rows, newRow, onChange, onFieldChange, emptyText, addLabel, footer, focusKey }) {
    const template = cols.map(c => c.w || '1fr').join(' ') + ' 76px';
    const wrap = el('div', { class: 'grid' });
    wrap.style.setProperty('--cols', template);

    const head = el('div', { class: 'grid-head' },
      cols.map(c => el('div', { style: c.type === 'num' || c.compute ? 'text-align:right' : null }, c.label)),
      el('div'));
    head.style.setProperty('--cols', template);
    const body = el('div');
    const foot = el('div', { class: 'grid-foot' });
    const addBtn = el('button', { type: 'button', class: 'grid-add', onclick: () => addRow() }, '+ ' + (addLabel || 'Ajouter une ligne'));
    wrap.append(head, body, foot, addBtn);

    function inputValue(v, c) {
      if (v == null) return '';
      return c.type === 'num' && typeof v === 'number' ? String(v).replace('.', ',') : String(v);
    }

    function changed() {
      onChange && onChange();
      drawFoot();
    }

    function drawFoot() {
      foot.replaceChildren(...(footer ? [footer()].flat() : []));
      foot.hidden = !footer;
    }

    function draw() {
      body.replaceChildren();
      if (!rows.length) body.append(el('div', { class: 'grid-empty' }, emptyText || 'Aucune ligne.'));
      rows.forEach((r, i) => body.append(rowEl(r, i)));
      drawFoot();
    }

    function rowEl(r, i) {
      const row = el('div', { class: 'grid-row' });
      row.style.setProperty('--cols', template);

      const refresh = () => {
        for (const c of cols) {
          const node = row.querySelector(`[data-k="${c.key}"]`);
          if (!node) continue;
          if (c.compute) node.textContent = c.compute(r);
          else if (document.activeElement !== node) node.value = inputValue(r[c.key], c);
        }
      };

      for (const c of cols) {
        const cell = el('div', { class: 'cell' });
        cell.style.setProperty('--m', c.m || 2);
        cell.append(el('span', { class: 'cell-label' }, c.label));
        let input;
        if (c.compute) {
          input = el('div', { class: 'computed' }, c.compute(r));
        } else if (c.type === 'select') {
          input = el('select', { 'aria-label': c.label }, c.options.map(([v, t]) => el('option', { value: v }, t)));
          input.value = r[c.key] ?? c.options[0][0];
        } else {
          input = el('input', {
            type: 'text',
            value: inputValue(r[c.key], c),
            placeholder: c.placeholder || null,
            list: c.list || null,
            inputmode: c.type === 'num' ? 'decimal' : null,
            autocomplete: 'off',
            'aria-label': c.label,
          });
        }
        input.dataset.k = c.key;
        if (!c.compute) {
          input.addEventListener('input', () => {
            r[c.key] = c.type === 'num' ? (Number.isFinite(num(input.value)) ? num(input.value) : '') : input.value;
            refresh();
            changed();
          });
          input.addEventListener('change', () => {
            if (onFieldChange && onFieldChange(r, c.key)) { refresh(); changed(); }
          });
          input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && input.tagName === 'INPUT') {
              e.preventDefault();
              input.dispatchEvent(new Event('change'));
              nextRow(i, c.key);
            }
          });
        }
        cell.append(input);
        row.append(cell);
      }

      row.append(el('div', { class: 'actions' },
        el('button', {
          type: 'button', class: 'icon ghost', title: 'Dupliquer la ligne', 'aria-label': 'Dupliquer la ligne',
          onclick: () => { rows.splice(i + 1, 0, clone(r)); draw(); changed(); },
        }, '⧉'),
        el('button', {
          type: 'button', class: 'icon ghost danger', title: 'Supprimer la ligne', 'aria-label': 'Supprimer la ligne',
          onclick: () => { rows.splice(i, 1); draw(); changed(); },
        }, '✕')));
      return row;
    }

    function focusRow(index, key) {
      const row = body.children[index];
      if (!row) return;
      const target = (key && row.querySelector(`input[data-k="${key}"], select[data-k="${key}"]`)) || row.querySelector('input, select');
      if (target) {
        target.focus();
        if (target.select) target.select();
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }

    function nextRow(i, key) {
      if (i + 1 < rows.length) focusRow(i + 1, key);
      else addRow(rows[i]);
    }

    function addRow(prev = rows[rows.length - 1]) {
      rows.push(newRow(prev, rows));
      draw();
      changed();
      focusRow(rows.length - 1, focusKey);
    }

    draw();
    return wrap;
  }

  // ---------------------------------------------------------------- Listes de suggestions

  function datalists(p) {
    const s = db.settings;
    const used = new Set(s.fournisseurs);
    db.projects.forEach(pr => pr.quinc.forEach(r => r.fournisseur && used.add(r.fournisseur.trim())));
    const des = new Set();
    db.projects.forEach(pr => pr.quinc.forEach(r => r.des && des.add(r.des.trim())));
    const mats = new Set(s.matieres.map(m => m.nom));
    if (p) p.debit.forEach(r => r.matiere && mats.add(r.matiere.trim()));
    const dl = (id, values) => el('datalist', { id }, [...values].filter(Boolean).map(v => el('option', { value: v })));
    return el('div', { hidden: true },
      dl('dl-matieres', mats),
      dl('dl-operations', s.operations),
      dl('dl-postes', s.postes),
      dl('dl-fournisseurs', used),
      dl('dl-quinc', des));
  }

  // ---------------------------------------------------------------- Export CSV

  const SEP = ';';

  function csvCell(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? String(Math.round(v * 1000) / 1000).replace('.', ',') : '';
    const s = v == null ? '' : String(v);
    return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function csv(rows) {
    // BOM UTF-8 pour qu'Excel affiche correctement les accents.
    return '﻿' + rows.map(r => r.map(csvCell).join(SEP)).join('\r\n') + '\r\n';
  }

  function csvHeader(p, titre) {
    return [
      [titre],
      ['Chantier', p.chantier],
      ['Date', frDate(p.date)],
      ['Rempli par', p.auteur],
      [],
    ];
  }

  function numOrBlank(v) { const n = num(v); return Number.isFinite(n) ? n : ''; }

  function csvDebitRows(p) {
    const rows = [['Repère', 'Désignation', 'Qté', 'Longueur (mm)', 'Largeur (mm)', 'Épaisseur (mm)', 'Matière', 'Sens du fil', 'Surface (m²)']];
    let pieces = 0, surface = 0;
    for (const r of p.debit) {
      if (isEmptyDebitRow(r)) continue;
      const s = surfacePiece(r);
      pieces += n0(r.qte);
      if (Number.isFinite(s)) surface += s;
      rows.push([r.rep, r.des, numOrBlank(r.qte), numOrBlank(r.L), numOrBlank(r.l), numOrBlank(r.ep), r.matiere,
        (FIL.find(f => f[0] === r.fil) || ['', ''])[1], Number.isFinite(s) ? s : '']);
    }
    rows.push([], ['Total pièces', '', pieces, '', '', '', '', 'Surface totale', surface]);
    return rows;
  }

  function csvQuincRows(p) {
    const rows = [['Référence', 'Désignation', 'Fournisseur / marque', 'Qté', 'Unité', 'Prix unitaire HT (€)', 'Total HT (€)']];
    let total = 0;
    for (const r of p.quinc) {
      if (!r.des && !r.ref) continue;
      const t = n0(r.qte) * n0(r.pu);
      total += t;
      rows.push([r.ref, r.des, r.fournisseur, numOrBlank(r.qte), r.unite, numOrBlank(r.pu), t]);
    }
    rows.push([], ['', '', '', '', '', 'Total quincaillerie', total]);
    return rows;
  }

  function csvAnalyseRows(p) {
    const a = analyseMatiere(p);
    const c = costs(p);
    const rows = [['MATIÈRE'], ['Matière', 'Nb pièces', 'Surface pièces (m²)', 'Chute (%)', 'Panneau (mm)', 'Nb panneaux', 'Prix panneau HT (€)', 'Total HT (€)']];
    for (const g of a.list) {
      rows.push([g.nom, g.pieces, g.surface, n0(p.chute), g.mat ? `${g.mat.longueur} x ${g.mat.largeur}` : '',
        Number.isFinite(g.nb) ? g.nb : '', Number.isFinite(g.prix) ? g.prix : '', Number.isFinite(g.total) ? g.total : '']);
    }
    rows.push([], ['GAMME D\'OPÉRATIONS'], ['N°', 'Opération', 'Poste / machine', 'Temps (h)', 'Coût MO HT (€)', 'Remarque']);
    p.gamme.forEach((r, i) => {
      if (!r.op && !Number.isFinite(num(r.temps))) return;
      rows.push([i + 1, r.op, r.poste, numOrBlank(r.temps), n0(r.temps) * n0(p.tauxHoraire), r.note]);
    });
    rows.push(['', 'Total', '', c.heures, c.mo], [],
      ['COÛT DE REVIENT HT'],
      ['Matière', c.matiere],
      ['Quincaillerie', c.quinc],
      ['Main d\'œuvre', c.mo, `${fmt(c.heures)} h x ${fmt(n0(p.tauxHoraire))} €/h`],
      ['Total coût de revient', c.total]);
    return rows;
  }

  const EXPORTS = {
    debit: { titre: 'FICHE DE DÉBIT', rows: csvDebitRows, file: 'fiche-debit' },
    analyse: { titre: 'ANALYSE DE FABRICATION', rows: csvAnalyseRows, file: 'analyse-fabrication' },
    quinc: { titre: 'FICHE DE QUINCAILLERIE', rows: csvQuincRows, file: 'quincaillerie' },
  };

  function exportCsv(p, which) {
    let rows;
    let file;
    if (which === 'all') {
      rows = csvHeader(p, 'DOSSIER DE FABRICATION');
      for (const k of Object.keys(EXPORTS)) rows.push([EXPORTS[k].titre], ...EXPORTS[k].rows(p), [], []);
      file = 'dossier-complet';
    } else {
      const x = EXPORTS[which];
      rows = [...csvHeader(p, x.titre), ...x.rows(p)];
      file = x.file;
    }
    download(`${slug(p.chantier)}_${file}.csv`, csv(rows), 'text/csv;charset=utf-8');
    toast('Fichier CSV téléchargé');
  }

  // ---------------------------------------------------------------- Vues

  const app = document.getElementById('app');

  function setNav(name) {
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === name));
  }

  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    window.scrollTo(0, 0);
    if (parts[0] === 'p' && parts[1]) return renderProject(parts[1], parts[2] || 'debit');
    if (parts[0] === 'reglages') return renderSettings();
    return renderHome();
  }
  window.addEventListener('hashchange', route);

  // ----- Accueil : liste des projets

  function renderHome() {
    setNav('home');
    document.title = 'Dossier Travail';
    const list = el('div', { class: 'projects' });
    const search = el('input', { type: 'search', class: 'search', placeholder: 'Rechercher un chantier…', 'aria-label': 'Rechercher' });

    function draw() {
      const q = norm(search.value);
      const items = [...db.projects]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .filter(p => !q || norm(`${p.chantier} ${p.auteur} ${p.date}`).includes(q));
      list.replaceChildren();
      if (!items.length) {
        list.append(el('div', { class: 'card muted' }, db.projects.length
          ? 'Aucun projet ne correspond à la recherche.'
          : 'Aucun projet pour l\'instant. Créez votre premier dossier avec « Nouveau projet ».'));
        return;
      }
      for (const p of items) {
        const c = costs(p);
        const nbPieces = p.debit.reduce((s, r) => s + n0(r.qte), 0);
        list.append(el('div', { class: 'project' },
          el('a', { class: 'title', href: `#/p/${p.id}` }, p.chantier || 'Chantier sans nom'),
          el('div', { class: 'meta' }, [frDate(p.date), p.auteur && `par ${p.auteur}`].filter(Boolean).join(' · ')),
          el('div', { class: 'meta' }, `${fmt(nbPieces, 0)} pièce(s) · ${p.quinc.length} article(s) · ${euro(c.total)}`),
          el('div', { class: 'row-actions' },
            el('button', { type: 'button', onclick: () => { location.hash = `#/p/${p.id}`; } }, 'Ouvrir'),
            el('button', { type: 'button', onclick: () => { const d = duplicateProject(p); location.hash = `#/p/${d.id}`; toast('Projet dupliqué'); } }, 'Dupliquer'),
            el('button', {
              type: 'button', class: 'danger',
              onclick: () => {
                if (!confirm(`Supprimer définitivement « ${p.chantier || 'Chantier sans nom'} » ?`)) return;
                db.projects = db.projects.filter(x => x !== p);
                saveNow();
                draw();
                toast('Projet supprimé');
              },
            }, 'Supprimer'))));
      }
    }
    search.addEventListener('input', draw);

    app.replaceChildren(
      el('div', { class: 'toolbar' },
        el('h1', { style: 'margin:0' }, 'Mes projets'),
        el('span', { class: 'spacer' }),
        el('button', { type: 'button', class: 'primary', onclick: () => { const p = newProject(); location.hash = `#/p/${p.id}`; } }, '+ Nouveau projet')),
      el('div', { class: 'toolbar' }, search),
      list,
      el('p', { class: 'muted small' },
        'Les projets sont enregistrés automatiquement dans ce navigateur. Pensez à faire une sauvegarde régulière depuis ',
        el('a', { href: '#/reglages' }, 'Réglages'), ' (utile aussi pour passer du téléphone à l\'ordinateur).'));
    draw();
  }

  // ----- Projet

  const TABS = [
    ['debit', 'Fiche de débit'],
    ['analyse', 'Analyse de fabrication'],
    ['quinc', 'Quincaillerie'],
  ];

  function renderProject(id, tab) {
    setNav('');
    const p = getProject(id);
    if (!p) {
      app.replaceChildren(el('div', { class: 'card' }, 'Projet introuvable. ', el('a', { href: '#/' }, 'Retour aux projets')));
      return;
    }
    if (!TABS.some(t => t[0] === tab)) tab = 'debit';
    const titre = () => p.chantier || 'Chantier sans nom';
    document.title = `${titre()} — Dossier Travail`;

    const h1 = el('h1', { class: 'no-print' }, titre());
    const printHead = el('div', { class: 'print-only' });
    const drawPrintHead = () => printHead.replaceChildren(
      el('h1', {}, `${TABS.find(t => t[0] === tab)[1]} — ${titre()}`),
      el('p', {}, `Date : ${frDate(p.date)} · Rempli par : ${p.auteur || '—'}`));
    drawPrintHead();

    const field = (label, key, attrs = {}) => {
      const input = el('input', Object.assign({ type: 'text', value: p[key] || '', autocomplete: 'off' }, attrs));
      input.addEventListener('input', () => {
        p[key] = input.value;
        if (key === 'auteur') db.settings.dernierAuteur = input.value;
        if (key === 'chantier') { h1.textContent = titre(); document.title = `${titre()} — Dossier Travail`; }
        drawPrintHead();
        touch(p);
      });
      return el('label', { class: 'field' }, label, input);
    };

    const content = el('div');
    const views = { debit: viewDebit, analyse: viewAnalyse, quinc: viewQuinc };

    app.replaceChildren(
      datalists(p),
      el('div', { class: 'toolbar no-print' },
        el('a', { href: '#/', class: 'btn' }, '← Projets'),
        el('span', { class: 'spacer' }),
        el('button', { type: 'button', onclick: () => exportCsv(p, tab) }, '⬇ CSV de cet onglet'),
        el('button', { type: 'button', onclick: () => exportCsv(p, 'all') }, '⬇ CSV dossier complet'),
        el('button', { type: 'button', onclick: () => window.print() }, '🖨 Imprimer')),
      h1,
      printHead,
      el('div', { class: 'card no-print' },
        el('div', { class: 'fields' },
          field('Nom du chantier', 'chantier', { placeholder: 'Ex. : Cuisine Dupont' }),
          field('Date', 'date', { type: 'date' }),
          field('Rempli par', 'auteur', { placeholder: 'Votre nom' }))),
      el('nav', { class: 'tabs' }, TABS.map(([k, label]) =>
        el('a', { href: `#/p/${p.id}/${k}`, class: k === tab ? 'active' : null }, label))),
      content);

    views[tab](p, content);
    if (!p.chantier && tab === 'debit') app.querySelector('.fields input').focus();
  }

  function viewDebit(p, root) {
    const footer = () => {
      const pieces = p.debit.reduce((s, r) => s + n0(r.qte), 0);
      const surface = p.debit.reduce((s, r) => s + (Number.isFinite(surfacePiece(r)) ? surfacePiece(r) : 0), 0);
      return [
        el('span', {}, 'Pièces : ', el('b', {}, fmt(pieces, 0))),
        el('span', {}, 'Surface totale : ', el('b', {}, fmt(surface, 3) + ' m²')),
      ];
    };

    root.append(el('div', { class: 'card' },
      el('p', { class: 'muted small no-print', style: 'margin-top:0' },
        'Dimensions finies en mm. Touche Entrée = ligne suivante (une nouvelle ligne est créée à la fin, avec la même matière).'),
      rowEditor({
        rows: p.debit,
        emptyText: 'Aucune pièce. Ajoutez la première ligne ci-dessous.',
        addLabel: 'Ajouter une pièce',
        focusKey: 'des',
        cols: [
          { key: 'rep', label: 'Rep.', w: '64px', m: 1 },
          { key: 'des', label: 'Désignation', w: 'minmax(120px,2fr)', m: 5, placeholder: 'Ex. : Côté' },
          { key: 'qte', label: 'Qté', type: 'num', w: '60px', m: 2 },
          { key: 'L', label: 'Longueur', type: 'num', w: '90px', m: 2 },
          { key: 'l', label: 'Largeur', type: 'num', w: '90px', m: 2 },
          { key: 'ep', label: 'Ép.', type: 'num', w: '64px', m: 2 },
          { key: 'matiere', label: 'Matière', list: 'dl-matieres', w: 'minmax(120px,1.6fr)', m: 4 },
          { key: 'fil', label: 'Sens du fil', type: 'select', options: FIL, w: '122px', m: 3 },
          { key: 'surf', label: 'm²', w: '70px', m: 3, compute: r => fmt(surfacePiece(r), 3) },
        ],
        newRow: (prev, rows) => {
          const last = rows.reduce((mx, r) => Math.max(mx, parseInt(r.rep, 10) || 0), 0);
          return { rep: String(last + 1), des: '', qte: 1, L: '', l: '', ep: prev ? prev.ep : '', matiere: prev ? prev.matiere : '', fil: prev ? prev.fil : 'L' };
        },
        onFieldChange: (r, key) => {
          if (key !== 'matiere') return false;
          const m = matiereByName(r.matiere);
          if (m && (r.ep === '' || r.ep == null)) { r.ep = num(m.ep); return true; }
          return false;
        },
        onChange: () => touch(p),
        footer,
      })));
  }

  function viewQuinc(p, root) {
    const history = quincHistory();
    root.append(el('div', { class: 'card' },
      el('p', { class: 'muted small no-print', style: 'margin-top:0' },
        'Les articles déjà saisis dans vos projets sont proposés en tapant la désignation : la référence, le fournisseur et le prix se remplissent tout seuls.'),
      rowEditor({
        rows: p.quinc,
        emptyText: 'Aucun article. Ajoutez la première ligne ci-dessous.',
        addLabel: 'Ajouter un article',
        cols: [
          { key: 'ref', label: 'Référence', w: 'minmax(90px,1fr)', m: 2 },
          { key: 'des', label: 'Désignation', list: 'dl-quinc', w: 'minmax(140px,2fr)', m: 4, placeholder: 'Ex. : Charnière 110°' },
          { key: 'fournisseur', label: 'Fournisseur / marque', list: 'dl-fournisseurs', w: 'minmax(100px,1.2fr)', m: 3 },
          { key: 'qte', label: 'Qté', type: 'num', w: '64px', m: 1 },
          { key: 'unite', label: 'Unité', type: 'select', options: UNITES.map(u => [u, u]), w: '80px', m: 2 },
          { key: 'pu', label: 'P.U. HT €', type: 'num', w: '90px', m: 3 },
          { key: 'total', label: 'Total HT', w: '100px', m: 3, compute: r => euro(n0(r.qte) * n0(r.pu)) },
        ],
        newRow: () => ({ ref: '', des: '', fournisseur: '', qte: 1, unite: 'u', pu: '' }),
        onFieldChange: (r, key) => {
          if (key !== 'des') return false;
          const h = history.get(norm(r.des));
          if (!h || h === r) return false;
          let filled = false;
          for (const k of ['ref', 'fournisseur', 'pu', 'unite']) {
            if ((r[k] === '' || r[k] == null || (k === 'unite' && r[k] === 'u')) && h[k] !== '' && h[k] != null) { r[k] = h[k]; filled = true; }
          }
          return filled;
        },
        onChange: () => touch(p),
        footer: () => el('span', {}, 'Total quincaillerie HT : ', el('b', {}, euro(costs(p).quinc))),
      })));
  }

  function viewAnalyse(p, root) {
    const matBox = el('div');
    const gammeBox = el('div');
    const kpis = el('div', { class: 'kpis' });

    function drawKpis() {
      const c = costs(p);
      const kpi = (label, v, sub, cls) => el('div', { class: 'kpi ' + (cls || '') },
        el('div', { class: 'label' }, label), el('div', { class: 'value' }, v), sub ? el('div', { class: 'muted small' }, sub) : null);
      kpis.replaceChildren(
        kpi('Matière', euro(c.matiere)),
        kpi('Quincaillerie', euro(c.quinc)),
        kpi('Main d\'œuvre', euro(c.mo), `${fmt(c.heures)} h × ${fmt(n0(p.tauxHoraire))} €/h`),
        kpi('Coût de revient HT', euro(c.total), null, 'total'));
    }

    function drawMatiere() {
      const a = analyseMatiere(p);
      if (!a.list.length) {
        matBox.replaceChildren(el('p', { class: 'muted' }, 'Aucune pièce dans la fiche de débit.'));
        return;
      }
      const rows = a.list.map(g => {
        const force = el('input', {
          type: 'text', inputmode: 'decimal', value: Number.isFinite(g.force) ? String(g.force) : '',
          placeholder: Number.isFinite(g.estim) ? String(g.estim) : '—', style: 'max-width:90px', 'aria-label': `Nombre de panneaux ${g.nom}`,
        });
        force.addEventListener('change', () => {
          const v = num(force.value);
          if (Number.isFinite(v)) p.panneaux[g.key] = v; else delete p.panneaux[g.key];
          touch(p);
          drawMatiere();
          drawKpis();
        });
        return el('tr', {},
          el('td', {}, g.nom),
          el('td', {}, fmt(g.pieces, 0)),
          el('td', {}, fmt(g.surface, 3)),
          el('td', {}, g.mat ? `${fmt(num(g.mat.longueur), 0)} × ${fmt(num(g.mat.largeur), 0)}` : '—'),
          el('td', {}, Number.isFinite(g.estim) ? fmt(g.estim, 0) : '—'),
          el('td', {}, force),
          el('td', {}, euro(g.prix)),
          el('td', {}, euro(g.total)));
      });
      const totalMat = a.list.reduce((s, g) => s + (Number.isFinite(g.total) ? g.total : 0), 0);
      matBox.replaceChildren(
        el('div', { class: 'table-scroll' },
          el('table', { class: 'summary' },
            el('thead', {}, el('tr', {}, ['Matière', 'Pièces', 'Surface m²', 'Panneau mm', 'Estim.', 'Nb panneaux', 'Prix panneau', 'Total'].map(t => el('th', {}, t)))),
            el('tbody', {}, rows),
            el('tfoot', {}, el('tr', {}, el('td', { colspan: 7 }, 'Total matière'), el('td', {}, euro(totalMat)))))),
        ...a.warnings.map(w => el('div', { class: 'warn' }, '⚠ ', w)));
    }

    function drawGamme() {
      gammeBox.replaceChildren(
        rowEditor({
          rows: p.gamme,
          emptyText: 'Aucune opération. Ajoutez les étapes de fabrication (débit, placage, usinage, montage…).',
          addLabel: 'Ajouter une opération',
          cols: [
            { key: 'op', label: 'Opération', list: 'dl-operations', w: 'minmax(140px,1.5fr)', m: 6 },
            { key: 'poste', label: 'Poste / machine', list: 'dl-postes', w: 'minmax(120px,1.3fr)', m: 3 },
            { key: 'temps', label: 'Temps (h)', type: 'num', w: '90px', m: 3, placeholder: '0,5' },
            { key: 'note', label: 'Remarque', w: 'minmax(120px,2fr)', m: 4 },
            { key: 'cout', label: 'Coût MO', w: '100px', m: 2, compute: r => euro(n0(r.temps) * n0(p.tauxHoraire)) },
          ],
          newRow: () => {
            const ops = db.settings.operations;
            const next = ops.find(o => !p.gamme.some(r => norm(r.op) === norm(o))) || '';
            return { op: next, poste: '', temps: '', note: '' };
          },
          onChange: () => { touch(p); drawKpis(); },
          footer: () => {
            const c = costs(p);
            return [el('span', {}, 'Temps total : ', el('b', {}, fmt(c.heures) + ' h')), el('span', {}, 'Main d\'œuvre : ', el('b', {}, euro(c.mo)))];
          },
        }),
        p.gamme.length ? null : el('button', {
          type: 'button', class: 'no-print', style: 'margin-top:10px',
          onclick: () => {
            db.settings.operations.forEach(op => p.gamme.push({ op, poste: '', temps: '', note: '' }));
            touch(p);
            drawGamme();
            drawKpis();
          },
        }, 'Pré-remplir avec toutes les opérations types'));
    }

    const numField = (label, key, suffix) => {
      const input = el('input', { type: 'text', inputmode: 'decimal', value: String(p[key] ?? '').replace('.', ','), autocomplete: 'off' });
      input.addEventListener('input', () => {
        const v = num(input.value);
        p[key] = Number.isFinite(v) ? v : '';
        touch(p);
        drawMatiere();
        drawKpis();
        if (key === 'tauxHoraire') drawGamme();
      });
      return el('label', { class: 'field' }, `${label} (${suffix})`, input);
    };

    root.append(
      el('div', { class: 'card' },
        el('h2', {}, 'Coût de revient'),
        kpis),
      el('div', { class: 'card' },
        el('h2', {}, 'Matière (d\'après la fiche de débit)'),
        el('div', { class: 'fields no-print', style: 'max-width:420px;margin-bottom:12px' },
          numField('Chute / perte', 'chute', '%'),
          numField('Taux horaire', 'tauxHoraire', '€/h')),
        el('p', { class: 'muted small no-print', style: 'margin-top:0' },
          'Nombre de panneaux estimé = surface des pièces + % de chute, arrondi au panneau supérieur. ',
          'Saisissez un nombre dans « Nb panneaux » pour forcer la valeur (après calepinage par exemple).'),
        matBox),
      el('div', { class: 'card' },
        el('h2', {}, 'Gamme d\'opérations'),
        gammeBox));

    drawKpis();
    drawMatiere();
    drawGamme();
  }

  // ----- Réglages

  function renderSettings() {
    setNav('reglages');
    document.title = 'Réglages — Dossier Travail';
    const s = db.settings;

    const numField = (label, key) => {
      const input = el('input', { type: 'text', inputmode: 'decimal', value: String(s[key] ?? '').replace('.', ',') });
      input.addEventListener('input', () => { const v = num(input.value); s[key] = Number.isFinite(v) ? v : 0; save(); });
      return el('label', { class: 'field' }, label, input);
    };

    const listField = (label, key) => {
      const ta = el('textarea', { rows: 6 });
      ta.value = s[key].join('\n');
      ta.addEventListener('input', () => { s[key] = ta.value.split('\n').map(x => x.trim()).filter(Boolean); save(); });
      return el('label', { class: 'field' }, label + ' (une par ligne)', ta);
    };

    const fileInput = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        const projects = Array.isArray(data.projects) ? data.projects : [];
        if (!projects.length && !data.settings) throw new Error('fichier non reconnu');
        let added = 0, replaced = 0;
        for (const p of projects) {
          normProject(p);
          const i = db.projects.findIndex(x => x.id === p.id);
          if (i >= 0) { db.projects[i] = p; replaced++; } else { db.projects.push(p); added++; }
        }
        if (data.settings && confirm('Remplacer aussi les réglages (catalogue matières, taux horaire…) par ceux du fichier ?')) {
          db.settings = Object.assign(clone(DEFAULT_SETTINGS), data.settings);
        }
        saveNow();
        toast(`Import terminé : ${added} ajouté(s), ${replaced} mis à jour`);
        renderSettings();
      } catch (e) {
        toast('Import impossible : ' + e.message);
      }
      fileInput.value = '';
    });

    app.replaceChildren(
      el('h1', {}, 'Réglages'),
      el('div', { class: 'card' },
        el('h2', {}, 'Valeurs par défaut des nouveaux projets'),
        el('div', { class: 'fields' },
          numField('Taux horaire (€/h)', 'tauxHoraire'),
          numField('Chute / perte matière (%)', 'chute'))),
      el('div', { class: 'card' },
        el('h2', {}, 'Catalogue matières (prix au panneau)'),
        el('p', { class: 'muted small', style: 'margin-top:0' },
          'Le nom doit correspondre à la matière saisie dans la fiche de débit. Dimensions du panneau brut en mm, prix HT.'),
        rowEditor({
          rows: s.matieres,
          addLabel: 'Ajouter une matière',
          cols: [
            { key: 'nom', label: 'Nom', w: 'minmax(160px,2fr)', m: 6 },
            { key: 'ep', label: 'Ép. mm', type: 'num', w: '80px', m: 2 },
            { key: 'longueur', label: 'Long. panneau', type: 'num', w: '110px', m: 2 },
            { key: 'largeur', label: 'Larg. panneau', type: 'num', w: '110px', m: 2 },
            { key: 'prix', label: 'Prix panneau €', type: 'num', w: '120px', m: 3 },
            { key: 'm2', label: '€/m²', w: '90px', m: 3, compute: r => { const sp = n0(r.longueur) * n0(r.largeur) / 1e6; return sp ? euro(n0(r.prix) / sp) : '—'; } },
          ],
          newRow: () => ({ nom: '', ep: '', longueur: 2800, largeur: 2070, prix: '' }),
          onChange: save,
        })),
      el('div', { class: 'card' },
        el('h2', {}, 'Listes de suggestions'),
        el('div', { class: 'fields' },
          listField('Opérations', 'operations'),
          listField('Postes / machines', 'postes'),
          listField('Fournisseurs', 'fournisseurs'))),
      el('div', { class: 'card' },
        el('h2', {}, 'Sauvegarde'),
        el('p', { class: 'muted small', style: 'margin-top:0' },
          'Les données restent dans ce navigateur. Exportez une sauvegarde pour la conserver ou la transférer sur un autre appareil (téléphone ↔ ordinateur), puis importez-la de l\'autre côté.'),
        el('div', { class: 'toolbar', style: 'margin:0' },
          el('button', {
            type: 'button', class: 'primary',
            onclick: () => {
              saveNow();
              download(`dossier-travail_sauvegarde_${today()}.json`, JSON.stringify(db, null, 2), 'application/json');
              toast('Sauvegarde téléchargée');
            },
          }, '⬇ Exporter la sauvegarde'),
          el('button', { type: 'button', onclick: () => fileInput.click() }, '⬆ Importer une sauvegarde'),
          fileInput),
        el('p', { class: 'muted small' }, `${db.projects.length} projet(s) enregistré(s).`)));
  }

  route();
})();
