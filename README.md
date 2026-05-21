# DSM — Digital Shopping Mall
## Prototype de test du modèle de précommande avec journal comptable automatisé

---

## 🏗️ Stack technique
- **Backend** : FastAPI + SQLAlchemy + PostgreSQL
- **Frontend** : Next.js 14 + TypeScript + Tailwind CSS
- **Infrastructure** : Docker Compose

---

## 🚀 Démarrage rapide

### Prérequis
- Docker + Docker Compose installés

### Lancement
```bash
cd dsm-system
docker-compose up --build
```

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8000
- **Docs API (Swagger)** : http://localhost:8000/docs

---

## 📋 Utilisation

### 1. Créer un compte Admin
- Aller sur http://localhost:3000/register
- Cocher "Compte administrateur"
- Exemples : admin@dsm.com / password123

### 2. Créer un compte User normal
- Même page, sans cocher Admin
- Exemple : user@dsm.com / password123

### 3. (Admin) Créer un produit
- Aller sur http://localhost:3000/admin → onglet Produits
- Créer un produit avec ces valeurs de test (issues du fichier Excel) :
  - Nom : "Produit Test DSM"
  - Prix fournisseur : 1500
  - Prix deal : 1800
  - Min commande fournisseur : 100
  - Taux DSC initial : 0.01

### 4. (Admin) Recharger le wallet DSP de l'utilisateur
- Aller sur http://localhost:3000/admin → onglet Utilisateurs
- Sélectionner l'utilisateur → ajouter 10 000 000 DSP

### 5. (User) Faire une précommande
- Aller sur http://localhost:3000
- Choisir un tier de réservation dans le tableau 1(a)
- Configurer B14 (% fournisseur DSP) et B15 (DME fiat/DSP)
- Confirmer la précommande

### 6. (Admin) Tester les conditions
- Aller sur http://localhost:3000/dashboard → cliquer sur la précommande
- Dans le panneau admin à droite :
  - Changer le taux DSC → recalcule P, T, maturité, tout le journal
  - Activer B7 (annulation) → génère les écritures d'annulation
  - Activer B8 (clôture) → génère les écritures de clôture
  - etc.

---

## 📊 Variables du modèle (Data Dictionary)

| Variable | Description |
|----------|-------------|
| **O** | DSPs réservés totaux (unités × DSPs/u.) |
| **P** | DSPs requis au taux courant |
| **Q** | Valeur totale des deals ($) |
| **R** | Valeur fournisseur ($) |
| **S** | Marge (Q − R) |
| **T** | DSPs excédentaires (O − P) |
| **H4** | Taux DSC courant |

## 🔀 Conditions (B7–B15)

| Condition | Déclencheur |
|-----------|-------------|
| **B7** | Annulation par le preorderer |
| **B8** | Vente des DSPs / clôture du deal |
| **B9** | Fournisseur ne livre pas |
| **B10** | Système prépaye le fournisseur |
| **B11** | Preorderer confirme réception |
| **B12** | Preorderer confirme réception (prépayé) |
| **B13** | DSM échoue à juger le litige |
| **B14** | % paiement fournisseur en DSPs |
| **B15** | Mode paiement DME (0=DSP, 1=Fiat) |

## ✅ Blocs comptables

| Bloc | Événement |
|------|-----------|
| Origination | Création de la réservation (toujours) |
| Cancellation | Si B7=1 |
| Closure | Si B8=1 |
| Supplier Failed | Si B9=1 |
| Prepayment | Si B10=1 |
| Completion | Si B11=1 |
| Prepaid Completion | Si B10=1 ET B12=1 |
| DSM Failed | Si B13=1 |

---

## 🎯 Précision comptable

Le moteur comptable utilise `Decimal` Python (pas float) pour éliminer les erreurs d'arrondi IEEE 754.
Précision : 8 décimales. Marge d'erreur < 0.001%.

Chaque bloc est validable via `GET /preorders/{id}/validate` qui retourne l'équilibre DR=CR pour chaque événement.
