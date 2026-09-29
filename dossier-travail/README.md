# Dossier Travail

Site web pour créer et remplir rapidement, sur ordinateur ou téléphone, les documents d'atelier de menuiserie / agencement :

- **Fiche de débit** : repère, désignation, quantité, longueur × largeur × épaisseur (mm), matière, sens du fil, surface calculée.
- **Analyse de fabrication** : gamme d'opérations (poste, temps) et coût de revient (matière au panneau + quincaillerie + main d'œuvre).
- **Fiche de quincaillerie** : référence, désignation, fournisseur / marque, quantité, unité, prix unitaire et total.

Chaque projet contient : nom du chantier, date, personne qui a rempli le dossier.

## Utilisation

- **Saisie type tableur** : cases encadrées et numéros de ligne comme dans Excel. Écrire dans la ligne « + » du bas crée une nouvelle ligne (la matière et l'épaisseur de la ligne précédente sont reprises). `Entrée` / `↓` / `↑` changent de ligne, `Tab` passe à la case suivante, ⧉ duplique une ligne.
- **Téléphone** : le tableau garde exactement les proportions de la version PC ; il est réduit pour tenir dans l'écran (zoom « Ajuster »). Les boutons − / + agrandissent la feuille pour écrire plus facilement, en la faisant défiler comme dans Excel.
- **Menus de propositions** : les cases marquées ▾ (matière, opération, poste, fournisseur, article) ouvrent une liste qui se filtre pendant la frappe ; `Entrée` choisit la proposition en surbrillance.
- **Matière** : choisir une matière du catalogue remplit l'épaisseur ; le nombre de panneaux est estimé (surface + % de chute) et peut être forcé à la main.
- **Quincaillerie** : un article déjà saisi dans un projet se complète tout seul (référence, fournisseur, prix).
- **Aperçu de la fiche** : bouton qui affiche la fiche au format « Standard atelier » (en-tête Chantier / Date / Rempli par, tableau encadré, totaux). C'est aussi ce qui sort à l'impression ou en PDF (*Imprimer / PDF* → *Enregistrer en PDF*).
- **Export CSV** (séparateur `;`, UTF-8) : s'ouvre directement dans Excel ; dans Google Sheets : *Fichier → Importer → Importer un fichier*.
- **Sauvegarde** : les projets sont enregistrés automatiquement dans le navigateur. *Réglages → Exporter la sauvegarde* crée un fichier JSON à réimporter sur un autre appareil.
- **Réglages** : catalogue matières (dimensions et prix du panneau), taux horaire, % de chute, listes d'opérations, postes et fournisseurs.

## Mise en ligne (GitHub Pages)

Le site est un simple dossier statique (`index.html`, `style.css`, `app.js`), sans serveur ni installation.

1. Sur GitHub : *Settings → Pages → Source : GitHub Actions*.
2. Chaque push sur `main` qui modifie `dossier-travail/` publie le site via `.github/workflows/pages.yml`.

En local, il suffit d'ouvrir `index.html` dans un navigateur.
