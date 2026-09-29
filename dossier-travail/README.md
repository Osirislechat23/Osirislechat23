# Dossier Travail

Site web pour créer et remplir rapidement, sur ordinateur ou téléphone, les documents d'atelier de menuiserie / agencement :

- **Fiche de débit** : repère, désignation, quantité, longueur × largeur × épaisseur (mm), matière, sens du fil, surface calculée.
- **Analyse de fabrication** : gamme d'opérations (poste, temps) et coût de revient (matière au panneau + quincaillerie + main d'œuvre).
- **Fiche de quincaillerie** : référence, désignation, fournisseur / marque, quantité, unité, prix unitaire et total.

Chaque projet contient : nom du chantier, date, personne qui a rempli le dossier.

## Utilisation

- **Saisie rapide** : `Entrée` passe à la ligne suivante et crée une nouvelle ligne à la fin (la matière et l'épaisseur sont reprises). ⧉ duplique une ligne.
- **Matière** : choisir une matière du catalogue remplit l'épaisseur ; le nombre de panneaux est estimé (surface + % de chute) et peut être forcé à la main.
- **Quincaillerie** : un article déjà saisi dans un projet se complète tout seul (référence, fournisseur, prix).
- **Export CSV** (séparateur `;`, UTF-8) : s'ouvre directement dans Excel ; dans Google Sheets : *Fichier → Importer → Importer un fichier*.
- **Sauvegarde** : les projets sont enregistrés automatiquement dans le navigateur. *Réglages → Exporter la sauvegarde* crée un fichier JSON à réimporter sur un autre appareil.
- **Réglages** : catalogue matières (dimensions et prix du panneau), taux horaire, % de chute, listes d'opérations, postes et fournisseurs.

## Mise en ligne (GitHub Pages)

Le site est un simple dossier statique (`index.html`, `style.css`, `app.js`), sans serveur ni installation.

1. Sur GitHub : *Settings → Pages → Source : GitHub Actions*.
2. Chaque push sur `main` qui modifie `dossier-travail/` publie le site via `.github/workflows/pages.yml`.

En local, il suffit d'ouvrir `index.html` dans un navigateur.
