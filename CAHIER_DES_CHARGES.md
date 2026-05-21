# Cahier des charges — Digital Shopping Mall (DSM)

> **Source primaire** : Document `DSM V1Final.docx` (Drive, 77 677 caractères, lu à 100 %)
> **Sources secondaires** : Feuilles Excel `DSM V1 Final.xlsx`, `DSM Scripting Ferdinand.xlsx` (4 onglets : 1(a), 1(b), 1(c), 1(d), Testing, As Transactions)
> **Auteur de la synthèse** : Claude (sous supervision Godson Ferdinand)
> **Date** : 2026-05-18
> **Version** : 1.0
> **Statut** : Brouillon de référence — à valider par le métier avant développement

---

# Partie I — CAHIER DES CHARGES FONCTIONNEL

## 1. Présentation du projet

### 1.1 Objectif
Construire **DSM (Digital Shopping Mall)** : une plateforme e-commerce hybride combinant un centre commercial en ligne avec un système de **précommande** (preorder) reposant sur une cryptomonnaie native **DSC** et son dérivé **DSP** (voucher 1:1 non transférable).

### 1.2 Problème résolu
Aligner offre et demande sur des achats groupés (bulk) sans que le fournisseur prenne de risque de stock, et offrir aux acheteurs un mécanisme financier (taux DSC variable) leur permettant éventuellement de bénéficier de l'appréciation du DSC.

### 1.3 Parties prenantes

| Acteur | Rôle |
|---|---|
| **DSM** | Opérateur du Mall, perçoit 30 % de la marge sous forme de revenus |
| **DME** (Digital Mall Executives) | Agents terrain : démarchent les suppliers, encadrent les contrats. Touchent **10 %** de la marge (DSP ou fiat selon option) |
| **Suppliers** | Fournisseurs/prestataires vendant en gros via DSM |
| **Preorderers / Buyers** | Membres acheteurs qui réservent les deals |
| **Endorsers** | Membres qui recommandent un produit/service à ajouter au Mall (touchent 30 % de la marge sur les deals issus de leur purchase) |
| **Sponsors / Inviters** | Membres qui partagent leur lien d'invitation (touchent 30 % de la marge) |
| **DSM Founders, Founding Members, Ordinary Members, Pre-launch buyers** | Niveaux de membres avec privilèges différenciés (notamment plafonds d'purchase) |

### 1.4 Promesses de valeur
- **Pour le preorderer** : prix inférieur au retail (markup 20 % vs souvent 50–100 % en supermarché) + spéculation possible sur l'appréciation du DSC.
- **Pour le supplier** : garantie de volume minimum avant production/livraison, paiement assuré.
- **Pour le DME** : revenus récurrents sur tous les deals qu'il fait entrer.
- **Pour DSM** : 30 % de la marge sur chaque transaction.

---

## 2. Concepts économiques fondamentaux

### 2.1 Devises et instruments

| Symbole | Nom | Nature | Convertibilité |
|---|---|---|---|
| **DSC** | Digital Shopping Coin | Cryptomonnaie frappée par DSM, listée sur exchange tiers | Échangeable contre fiat sur exchange |
| **DSP** | Digital Shopping Points | Voucher interne dérivé du DSC à **1:1**, non transférable, non encaissable (sauf héritage) | **Conversion DSC → DSP irréversible** |
| **Fiat** | USD / EUR / BRL (BRIC dans le doc — typo probable) | Devise de référence des deals | Pour paiement supplier et DME |

⚠️ **Point juridique central** : DSM ne vend **pas** de cryptomonnaie. DSM vend des **produits et services à l'avance**, encaissés sous forme de DSP (vouchers numériques). Argument prévu pour échapper à la qualification de vente de crypto.

### 2.2 Le modèle de pricing

```
Prix supplier         = négocié au gros entre supplier et DME
Prix Mall (deal)      = Prix supplier × 1.20   (markup 20 %)
Markup (S)            = Prix Mall − Prix supplier
```

Si le prix supermarché du produit est plus élevé et que le supplier interdit la vente en-dessous, DSM peut publier au prix supermarché (markup > 20 %).

### 2.3 Répartition de la marge (S = markup)

Verbatim du document :
> *"30 % to be paid as DSM revenues. 30 % as purchase commissions. 30 % as product/service Purchase commissions (code 2130), 10 % as DME commission, payable either in DSPs or fiat currency, depending on DME's option."*

```
┌────────────────────────────────────────┐
│        MARGE TOTALE S = Q − R          │
└────────────────────────────────────────┘
            │
    ┌───────┼───────┬──────────┬──────────┐
    │       │       │          │          │
   30%     30%     30%        10%
    │       │       │          │
  Revenu  Endorse  Purchase   DME
   DSM    commiss  commiss    commiss
                                (DSP ou Fiat)
```

### 2.4 Détail Purchase commissions (code 2130) (30 %)
Réparties sur l'arbre d'invitation de l'acheteur :
- **25 %** au Sponsor Niveau 1 (lien qui a fait précommander)
- **25 %** à l'Inviter Niveau 1 (lien qui a fait rejoindre DSM)
- **25 %** réparti équitablement entre Sponsors niveaux 2 à 10
- **25 %** réparti équitablement entre Inviters niveaux 2 à 10

Si l'acheteur n'est pas venu via un lien : 100 % des commissions Sponsor reviennent à l'équipe Inviter.

### 2.5 Détail Purchase commissions (code 2130) (30 %)
Payées **uniquement** sur l'arbre Inviter de l'endosseur :
- **50 %** à l'endosseur
- **25 %** à l'Inviter Niveau 1 de l'endosseur
- **25 %** réparti équitablement (25 %/9) sur niveaux 2 à 10

**Plafond** : 100 000 $ de commissions cumulées par endosseur par deal. Au-delà → reversé à DSM.

### 2.6 Tracking affiliate
**30 jours** de fenêtre attribution (cookie / lien token signé / wallet ID — méthode à spécifier en phase tech).

---

## 3. Les 14 tiers de réservation

### 3.1 Définition
> *"10 %, 50 %, 70 %, 90 %, 100 %, 120 %, 150 %, 200 %, 250 %, 300 %, 500 %, 800 %, 1 000 % and 10 000 % of the current ruling DSC exchange rate"*

Le pourcentage représente le **prix DSC minimum** que le préordonneur accepte pour vendre ses DSP lorsque DSM clôture le deal (= **strike price** du préordonneur).

### 3.2 Sémantique économique

| Choix du tier | Signification | Profil |
|---|---|---|
| < 100 % | "Je dois être protégé même si le DSC baisse" → réserver beaucoup de DSP | **Défensif** |
| 100 % | "Je suis au prix marché actuel" | **Neutre** |
| > 100 % | "Je parie que le DSC va monter" → réserver peu de DSP | **Spéculatif haussier** |

### 3.3 Formules
```
Reservation rate         = tier_pct × DSC_ruling_rate
Reserved DSPs per unit   = Deal_price ÷ reservation_rate
USD equivalent           = DSC_ruling_rate × Reserved_DSPs_per_unit
```

### 3.4 Exemple (extrait sheet 1(b), Vostro 7620, deal = 1 800 $, DSC = 50 000 $)

| Tier | Reservation rate | DSPs/unit | USD eq. |
|---|---|---|---|
| 10 % | 5 000 | 0.36 | 18 000 |
| 90 % | 45 000 | 0.04 | 2 000 |
| 100 % | 50 000 | 0.036 | 1 800 |
| 200 % | 100 000 | 0.018 | 900 |
| 10 000 % | 5 000 000 | 0.00036 | 18 |

---

## 4. Cycle de vie d'une précommande

### 4.1 Diagramme d'états

```
                  [Originated]
                      │
                      ▼
                  [Waiting] ──────────┐
                  │  │   │            │
            B7=1  │  │   │ B8=1       │ 7 jours sans crystallization
                  ▼  │   ▼            ▼
            [Cancelled]  [Closed] [Cancellable par préordonneur]
                            │
            ┌───────────────┼──────────────┐
            │ B11=1         │ B9=1         │ 30j sans completion
            ▼               ▼              ▼
       [Completed]  [SupplierFailed]  [Prepaid] (60j → auto B10=1)
                                            │
                                       B12=1 │
                                            ▼
                                       [Completed]

         + Dispute non résolue 1 an → DSM_FAILED (B13=1, frais DSM)
```

### 4.2 Statuts et conditions déclencheurs

| Statut | Condition | Bloc comptable déclenché |
|---|---|---|
| **Originated** | Création | Bloc 2 (Origination) |
| **Waiting** | Aucune autre condition vraie | — |
| **Cancelled** | B7=1 (préordonneur annule) | Bloc 3 (Cancellation) |
| **Closed** | B8=1 (DSP vendus ou deal 100 % DSP crystallisé) | Bloc 4 (Closure) |
| **SupplierFailed** | B9=1 (supplier ne livre pas après closure) | Bloc 5 (Refund preorderer) |
| **Prepaid** | B10=1 (60j sans completion) | Bloc 6 (Prepayment supplier) |
| **Completed** | B11=1 ou (B10=1 ET B12=1) | Bloc 7 ou 8 |
| **DSMFailed** | B13=1 (DSM ne tranche pas dispute en 1 an) | Bloc 9 (Refund aux frais DSM) |

### 4.3 Formule de statut (verbatim, à porter en code)
```
=IF(OR(B7=1,B9=1),"Cancelled",
  IF(AND(B8=1,B11=1),"Completed",
    IF(AND(B7=0,B8=0,B9=0,B11=0),"Waiting",
      IF(AND(B8=1,B10=1,B12=0),"Prepaid",
        IF(AND(B10=1,B12=1),"Completed","Closed")))))
```

---

## 5. Maturity, Excess, Deficiency, Crystallization

### 5.1 Variables du data dictionary

| Variable | Type | Formule | Sens |
|---|---|---|---|
| **O** (Reserved DSPs) | **Fixe** | `units × DSPs_per_unit_at_origination` | DSP bloqués à la réservation |
| **P** (Requisite DSPs) | **Variable** | `units × (deal_price ÷ DSC_current_rate)` | DSP nécessaires au taux actuel |
| **T** (Excess DSPs) | Variable | `max(O − P, 0)` | Surplus de DSP (remboursés à closure) |
| **U** (Deficiency DSPs) | Variable | `max(P − O, 0)` | Manque de DSP (deal ne peut mûrir) |
| **Q** (Deal value) | Fixe | `units × deal_price` | Valeur USD du deal |
| **R** (Supplier value) | Fixe | `units × supplier_price` | Coût USD côté supplier |
| **S** (Markup) | Fixe | `Q − R` | Marge totale |
| **H** | Variable | Taux DSC courant lu sur exchange | — |
| **H₀** | Fixe | `tier_pct × H_at_origination` | Original reservation rate |
| **H₁** | Variable | `tier_pct × H_current` | Current reservation rate |

> ⚠️ Lors d'un changement de DSC rate, **seuls** H, H₁, P, T, U et maturity sont recalculés. Tous les autres champs sont **immutables**.

### 5.2 Règle de maturité
```
Mature   ⟺ (H₀ ≤ H₁) AND (H₀ ≤ H)
Immature ⟺ sinon
```
Formule Excel verbatim : `=IF(AND(F4<=G4,F4<=H4),"Mature","Immature")`

### 5.3 Règle de crystallization (au niveau supplier deal global)
```
Global_min_order_qty = Supplier_min_order × 1.20   (20 % de marge de sécurité)

Crystallized ⟺ SUM(units des préordonneurs Mature ET Waiting) ≥ Global_min_order_qty
```
**Sont exclus** du compte : Cancelled, Closed, Prepaid, Completed, Immature.

### 5.4 Action de crystallization
1. Le supplier reçoit notification dans son back office.
2. Il clique pour donner le **go-ahead**.
3. DSM vend les DSP réservés (sous forme DSC) sur exchange → obtient le fiat nécessaire.
4. DSM paie le supplier (en USD ou DSP selon B14) et le DME (en USD ou DSP selon B15).
5. Statuts mis à jour : préordonneurs concernés passent à **Closed**, leurs DSP en excès sont remboursés (T).

**Cas spécial** : si le supplier accepte 100 % en DSP (B14 = 1.00), pas besoin de vendre sur exchange → closure immédiate après crystallization. Le DME ne peut alors être payé qu'en DSP (B15 forcé à 0).

---

## 6. Les 9 blocs comptables (As Transactions sheet)

Chaque bloc est un ensemble d'écritures débit/crédit déclenchées par une condition. Tous les blocs sont en équilibre **DR = CR** (en équivalent DSP).

### Bloc 0 — BUY_DSPS
Quand un membre achète des DSP en payant fiat :
```
DR  DSM Fiat currency account
CR  Depositor's DSP wallet
```

### Bloc 1 — ORIGINATION (toujours généré)
```
DR  Preorder's voucher Liability (code 2141)     = O
CR  Preorder Liabilities (code 2010)             = O
```

### Bloc 2 — CANCELLATION (B7=1)
```
DR  Preorder Liabilities (code 2010)             = O
CR  Preorder's voucher Liability (code 2141)     = O
```
Effet : inverse l'origination → DSP retournent au wallet.

### Bloc 3 — CLOSURE (B8=1)
8 lignes (avec excess refund T si T > 0) :
```
DR  Preorder Liabilities (code 2010)     = O
CR  Supplier Escrow Liability Fiat (code 2021)     = R × (1−B14)
CR  Supplier's Voucher Liability (code 2142)       = R/Q × P × B14
CR  DSM margin payable (code 2120)                        = S/Q × P × 30 %
CR  DME Commission payable (DSP)              = S/Q × P × 10 %    si B15=0
CR  DME Commission payable (Fiat)             = S × 10 %          si B15=1
CR  Members' commissions payable              = S/Q × P × 60 %
CR  Preorder's voucher Liability (code 2141) (excess refunded) = T   si T>0
```

### Bloc 4 — SUPPLIER_FAILED (B9=1)
Inverse de la closure → tout retourne au préordonneur :
```
DR  Tout ce qui était CR dans le bloc CLOSURE
CR  Preorder's voucher Liability (code 2141)     (somme DSP)
CR  Preorderer's USD payments   (somme USD)
```

### Bloc 5 — PREPAYMENT (B10=1)
Quand 60 jours s'écoulent sans dispute, le système prépaie le supplier :
```
DR  Supplier Prepayment (code 1301)        = R × (1−B14)
DR  Supplier Prepayment (code 1301)        = R/Q × P × B14
DR  Other Prepayment (code 1302)               = S/Q × P × 10 %  si B15=0
DR  Other Prepayment (code 1302)               = S × 10 %        si B15=1
CR  DSM USD wallet (Supplier payment)       = R × (1−B14)
CR  DSM USD wallet (DME payment)            = S × 10 %        si B15=1
CR  Supplier's DSP wallet                   = R/Q × P × B14
CR  DME's DSP wallet                        = S/Q × P × 10 %  si B15=0
```

### Bloc 6 — COMPLETION (B11=1, non prépayé)
13 lignes — distribue la marge 30/30/30/10 aux comptes de revenu finaux :
```
DR  Supplier Escrow Liability Fiat (code 2021), DSP escrow, DSM margin payable (code 2120),
    DME Commission, Members' commissions (mêmes montants que CLOSURE)
CR  DSM USD account, Supplier DSP wallet, DSM revenue,
    DME wallet, DSM USD (DME), Purchase commissions (code 2130), Purchase commissions (code 2130)
```

### Bloc 7 — PREPAID_COMPLETION (B10=1 ET B12=1)
13 lignes — équivalent du Bloc 6 mais sourcé depuis les advance payments du Bloc 5.

### Bloc 8 — DSM_FAILED (B13=1)
4 lignes — DSM compense aux frais de DSM :
```
DR  Supplier's expense account (USD)   = R × (1−B14)
DR  Supplier's expense account (DSP)   = R/Q × P × B14
CR  Supplier's USD wallet              = R × (1−B14)
CR  Supplier's DSP wallet              = R/Q × P × B14
```

---

## 7. Spécifications fonctionnelles UI/UX

### 7.1 Page d'accueil
- Contenu marketing introductif (mission, fonctionnement, témoignages).
- En haut à droite : **Login** / **Sign up** (texte adapté à la langue détectée) + menu déroulant de langues.

### 7.2 Inscription
**Étape 1** :
- Email
- Password (≥ 8 caractères avec majuscule, minuscule, chiffre, caractère spécial)
- **Masterpin** de 10 chiffres (le système tirera aléatoirement 4 positions comme credentials de login → mécanisme anti-keylogger)
- Activation par email

**Étape 2** (KYC light) :
- Prénom, nom du milieu, nom
- Genre, date de naissance
- Pays, région, district
- Langues parlées

**Étape 3** (KYC complet, requis avant tout shopping) :
- Pièce d'identité gouvernementale
- Justificatif d'adresse
- Selfie avec ID
- → Provider tiers à choisir (Onfido, Veriff, Jumio…)

### 7.3 Menus principaux après login
- **Products** : sous-menus *Reservation* + *Purchase* (chaque avec moteur de recherche local).
- **Services** : sous-menus *Reservation* + *Purchase*.
- Listes catégorisées par **localisation géographique** (déduite de l'adresse de livraison KYC), triées par prix croissant.
- **Back office membre** : wallet DSP, arbre d'affiliés, produits achetés, deals précommandés.
- **Back office supplier** : wallets, produits/services vendus, bouton approbation crystallization, input box disputes.

### 7.4 Page produit/service
Composants :
1. Carousel images/vidéos
2. Description longue
3. **Deal reservation table** (les 14 tiers, avec colonnes : % du future rate, reservation rate, DSPs/unit, USD eq, bouton Preorder)
4. Bouton **Buy DSPs** sous le tableau (paiement USD/EUR/BRL/cryptos liquides)
5. Bouton **Unavailable** inactif si produit non livrable dans la zone du membre

### 7.5 Modal Preorder
- Champ « Number of units »
- Vérifications client+serveur :
  - Units ≥ personal minimum order qty
  - Solde DSP suffisant pour `units × DSPs/unit`
- Sinon → popup d'erreur avec lien direct **Buy DSPs**
- Si OK → crée le data dictionary, passe les écritures d'Origination, confirme par popup

### 7.6 Back office membre — vue détail d'un deal réservé
Affichage du **data dictionary** complet (17+ paires clé-valeur), notamment :
- Serial number, Reservation date, Deal's name, Reservation option
- Original / current reservation rate, DSC ruling rate
- Supplier's price, Deal's price, Units
- Reserved DSPs/unit, DSPs needed/unit, Reserved DSPs (O), Requisite DSPs (P)
- Deal's value (Q), Supplier's value (R), Markup (S)
- Excess / Deficient DSPs (T / U)
- Maturity test, Crystallization status, Deal status

Boutons :
- **Cancel** (visible si statut Waiting et > 7 jours sans crystallization) → popup confirmation → déclenche B7
- **Confirm receipt** (visible si statut Closed ou Prepaid) → popup :
  > *"Be sure you have actually received this deal in good order before confirming it because the confirmation can't be reversed"*
  → Devient **Confirmed**, déclenche B11 ou B12

### 7.7 Dispute box
- Input box dans le back office préordonneur ET supplier/courier/warehouse
- Réponses visibles des deux côtés
- Sous la box : zone où DSM publie sa décision finale

### 7.8 Purchase form
Champs : nom du produit/service, spécifications, prix de détail, nom du fournisseur, localisation, site web.

### 7.9 Logique de visibilité géographique
Visiteurs non logués : voient + cherchent mais ne peuvent pas agir.
Visiteurs logués : ne peuvent précommander que si le deal est livrable dans leur shipping address KYC.

---

## 8. Règles métier détaillées

### 8.1 Délais légaux contractuels

| Délai | Évènement déclencheur | Action |
|---|---|---|
| **7 jours** | Sans crystallization | Cancellation possible par préordonneur |
| **30 jours** | Après closure sans completion | Rappels de réception tous les 3 jours |
| **60 jours** | Après closure sans completion | **Prépaiement automatique irréversible** (B10=1) |
| **30 jours** | Dispute ouverte sans réponse supplier | Cancellation système (B9=1) |
| **30 + 30 jours** | Dispute non résolue après réponse | Période de négociation |
| **1 an** | Dispute toujours non résolue | DSM doit trancher |
| **> 1 an** | DSM n'a pas tranché | Deal clôturé aux frais de DSM (B13=1) |

### 8.2 Plafonds d'purchase

| Statut membre | Limite annuelle | Portée géographique |
|---|---|---|
| Ordinary members | 2 deals/an | Ville uniquement |
| Founding Members | 10 deals/an | Ville uniquement |
| DSM Founders + famille (conjoints, enfants, petits-enfants) | Illimité | Global |
| Pre-launch buyers | Illimité | Global |

### 8.3 Plafond commissions purchase
**100 000 $** par deal par endosseur. Au-delà → revenu DSM.

### 8.4 Compte supplier
- Upload obligatoire à l'inscription : **certificat d'incorporation certifié + business licence**
- Credentials pour **3 officers**
- Option **multi-signature** (≥ 2 personnes) pour approuver transactions

---

## 9. Exigences non fonctionnelles

> ⚠️ Le document source est **silencieux** sur la plupart des NFR. Cette section contient les recommandations issues de l'analyse, à valider.

### 9.1 Performance
- Temps de réponse < 500 ms pour 95 % des requêtes catalog
- Mise à jour du taux DSC : polling exchange toutes les 60 s minimum, push WebSocket aux clients connectés
- Recalcul P/T/U sur tous les préordonneurs en cours doit tenir sous **1 minute** pour 1M de préordonneurs

### 9.2 Disponibilité
- SLA visé : **99.5 %** (~4 h downtime/mois)
- Maintenance planifiée annoncée 72 h à l'avance

### 9.3 Sécurité
- HTTPS partout, HSTS
- Hash password : Argon2id (ou bcrypt cost ≥ 12)
- Masterpin chiffré (AES-GCM avec KEK rotée)
- JWT courts (15 min) + refresh tokens rotation
- Audit log immuable de toutes les transactions
- Wallets DSP : tracking double-entrée comptable (jamais de UPDATE direct, toujours par écritures)

### 9.4 Conformité
- KYC tier 1 (identité) avant tout achat
- KYC tier 2 (justificatif domicile) pour wallets > 10 000 $ équivalent
- AML : monitoring transactions, alertes patterns suspects
- GDPR/CCPA : droit à l'oubli (sauf obligations légales de conservation 5+ ans)
- Conservation des journaux comptables : **10 ans** (réglementation comptable)

### 9.5 Internationalisation
- i18n complet (clés de traduction, pas de string hardcodée)
- Devises multiples : USD, EUR, BRL (au minimum)
- Formats date/nombre locaux
- RTL non requis (à confirmer)

### 9.6 Scalabilité cible
- 100 000 utilisateurs actifs mensuels en phase 1
- 1M en phase 2
- Architecture : web + API stateless derrière load balancer, DB primary + read replicas, queue pour calculs async

---

## 10. Architecture technique recommandée

> ⚠️ Le document source mentionne plusieurs pistes (Excel, MySQL, Solidity). Voici une **proposition** d'architecture pour un déploiement web classique.

### 10.1 Stack proposée

| Couche | Technologie recommandée | Alternative |
|---|---|---|
| Frontend | Next.js + TypeScript + Tailwind | React + Vite |
| Backend API | FastAPI (Python) + SQLAlchemy + Pydantic | Node.js + NestJS |
| BDD principale | PostgreSQL 15+ | MySQL 8 |
| Cache / sessions | Redis | Memcached |
| Queue jobs | Celery + Redis | BullMQ |
| Auth | JWT + refresh tokens (jose / passlib) | OAuth2 + Keycloak |
| Précision financière | **Python `Decimal` ou Postgres `NUMERIC(24,8)`** — JAMAIS de float | — |
| Blockchain (DSC) | Externe — utiliser API exchange (Binance/Kraken) pour prix | Smart contract Solidity en option |
| Hosting | Docker + Kubernetes (GKE / EKS) | Render / Fly.io pour MVP |
| CDN | Cloudflare | CloudFront |

### 10.2 Schéma de base de données (tables principales)

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    masterpin_encrypted TEXT NOT NULL,
    full_name VARCHAR(255),
    kyc_status VARCHAR(20) DEFAULT 'pending',
    member_level VARCHAR(20) DEFAULT 'ordinary', -- ordinary/founding/founder
    inviter_user_id BIGINT REFERENCES users(id),
    dsp_balance NUMERIC(24,8) NOT NULL DEFAULT 0,
    usd_balance NUMERIC(24,8) NOT NULL DEFAULT 0,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    supplier_price NUMERIC(24,8) NOT NULL,
    deal_price NUMERIC(24,8) NOT NULL,        -- typiquement supplier_price × 1.20
    supplier_min_order INT NOT NULL,
    dsc_ruling_rate NUMERIC(24,8) NOT NULL,   -- snapshot au moment de la création/refresh
    geography JSONB,                          -- pays/régions où dispo
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reservation_options (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    tier_pct NUMERIC(10,4) NOT NULL,          -- 0.10, 0.50, ..., 100.00
    reservation_rate NUMERIC(24,8) NOT NULL,
    dsps_per_unit NUMERIC(24,8) NOT NULL,
    usd_equivalent NUMERIC(24,8) NOT NULL
);

CREATE TABLE preorders (
    id BIGSERIAL PRIMARY KEY,
    unique_id BIGINT UNIQUE NOT NULL,         -- serial business 10+ chiffres
    user_id BIGINT REFERENCES users(id),
    product_id BIGINT REFERENCES products(id),
    option_id BIGINT REFERENCES reservation_options(id),
    reserved_units INT NOT NULL,
    tier_pct NUMERIC(10,4) NOT NULL,
    -- Fixed at origination
    original_reservation_rate NUMERIC(24,8) NOT NULL,
    reserved_dsps_per_unit NUMERIC(24,8) NOT NULL,
    reserved_dsps NUMERIC(24,8) NOT NULL,       -- O
    deals_value NUMERIC(24,8) NOT NULL,         -- Q
    suppliers_value NUMERIC(24,8) NOT NULL,     -- R
    deals_markup NUMERIC(24,8) NOT NULL,        -- S
    -- Variables (recomputed on DSC rate change)
    dsc_ruling_rate NUMERIC(24,8) NOT NULL,
    current_reservation_rate NUMERIC(24,8) NOT NULL,
    dsps_needed_per_unit NUMERIC(24,8) NOT NULL,
    requisite_dsps NUMERIC(24,8) NOT NULL,      -- P
    excess_dsps NUMERIC(24,8) NOT NULL,         -- T
    deficiency_dsps NUMERIC(24,8) NOT NULL,     -- U
    -- Statuses
    maturity_status VARCHAR(20) NOT NULL,
    crystallization_status VARCHAR(20) NOT NULL,
    deal_status VARCHAR(20) NOT NULL,
    -- Conditions
    b7_cancelled BOOLEAN DEFAULT FALSE,
    b8_deal_closed BOOLEAN DEFAULT FALSE,
    b9_supplier_failed BOOLEAN DEFAULT FALSE,
    b10_prepaid BOOLEAN DEFAULT FALSE,
    b11_confirmed BOOLEAN DEFAULT FALSE,
    b12_prepaid_confirmed BOOLEAN DEFAULT FALSE,
    b13_dsm_failed BOOLEAN DEFAULT FALSE,
    b14_supplier_dsp_pct NUMERIC(5,4) DEFAULT 0.10,
    b15_dme_fiat BOOLEAN DEFAULT TRUE,
    reservation_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    min_order INT NOT NULL,
    supplier_price NUMERIC(24,8) NOT NULL,
    deal_price NUMERIC(24,8) NOT NULL
);

CREATE TABLE journal_entries (
    id BIGSERIAL PRIMARY KEY,
    preorder_id BIGINT REFERENCES preorders(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL,           -- ORIGINATION, CANCELLATION, etc.
    account_name VARCHAR(100) NOT NULL,
    debit NUMERIC(24,8) NOT NULL DEFAULT 0,
    credit NUMERIC(24,8) NOT NULL DEFAULT 0,
    account_type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL,             -- DSP / USD / EUR
    dsp_equivalent NUMERIC(30,8) NOT NULL,     -- signé pour validation DR=CR
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_journal_preorder_event ON journal_entries(preorder_id, event_type);
CREATE INDEX idx_preorders_user ON preorders(user_id);
CREATE INDEX idx_preorders_product_status ON preorders(product_id, deal_status, maturity_status);
```

### 10.3 Endpoints API minimaux

| Méthode | Path | Description |
|---|---|---|
| POST | `/auth/register` | Inscription (étapes 1+2) |
| POST | `/auth/login` | Login email+password+pin |
| GET | `/auth/me` | Profil |
| GET | `/products/` | Catalogue filtré par géographie |
| GET | `/products/{id}` | Détail + 14 tiers |
| POST | `/preorders/` | Créer précommande |
| GET | `/preorders/` | Mes précommandes |
| GET | `/preorders/{id}` | Détail + data dictionary + journal |
| PUT | `/preorders/{id}/conditions` | Toggle B7-B15, recalcul journal |
| POST | `/preorders/{id}/cancel` | Annulation préordonneur (B7) |
| POST | `/preorders/{id}/confirm` | Confirmation réception (B11/B12) |
| POST | `/preorders/{id}/dispute` | Ouvrir dispute |
| DELETE | `/preorders/{id}` | Supprimer (avec refund si applicable) |
| GET | `/admin/crystallization/{product_id}` | Status crystallization |
| POST | `/admin/dsc-rate` | Mettre à jour taux DSC, recalculer tous P/T/U |
| GET | `/admin/journal/validate/{preorder_id}` | DR=CR par bloc |
| (autres) | Endpoints suppliers, DME, purchases, affiliés | À détailler en phase 2 |

### 10.4 Précision financière — exigence non négociable
**Toutes les valeurs monétaires** (DSP, USD, etc.) doivent être stockées et calculées en `Decimal` 8 chiffres après la virgule (Python `Decimal` ou Postgres `NUMERIC(24,8)`).

Cible : **erreur max 0,001 %** sur le DR=CR balance par bloc. **Aucun `float`** dans le code financier.

### 10.5 Job de recalcul périodique
- Toutes les 60 s : `update_dsc_rate()` → recalcule P/T/U/maturity/crystallization pour tous les préordonneurs Waiting + Mature.
- Toutes les heures : `check_prepayment_deadline()` → préordonneurs Closed depuis > 60 j → toggle B10=1.
- Toutes les 24 h : `check_cancellation_window()`, `check_dispute_deadlines()`, `expire_temp_addresses()`.

---

## 11. Glossaire complet

| Terme | Définition |
|---|---|
| **DSM** | Digital Shopping Mall, la plateforme |
| **DME** | Digital Mall Executives, agents commerciaux terrain |
| **DSC** | Digital Shopping Coin, cryptomonnaie native |
| **DSP** | Digital Shopping Points, voucher 1:1 du DSC, non transférable |
| **Originated** | Statut initial après réservation |
| **Mature** | H₀ ≤ H₁ et H₀ ≤ H — DSP réservés suffisants |
| **Immature** | Cas contraire, DSP insuffisants |
| **Crystallized** | Total unités matures+waiting ≥ global_min_order_qty |
| **Closed** | DSP vendus ou deal 100 % DSP crystallisé |
| **Prepaid** | Supplier prépayé après 60 j sans dispute |
| **Completed** | Préordonneur a confirmé la réception |
| **Cancelled** | Annulation par préordonneur ou échec supplier |
| **Waiting** | Statut par défaut |
| **Reservation rate (strike)** | % du future rate × ruling DSC rate |
| **Ruling DSC rate** | Taux DSC courant sur exchange |
| **O** | Reserved DSPs (fixe) |
| **P** | Requisite DSPs (variable) |
| **T** | Excess DSPs = max(O − P, 0) |
| **U** | Deficiency DSPs = max(P − O, 0) |
| **Q** | Deal value = units × deal_price |
| **R** | Supplier value = units × supplier_price |
| **S** | Markup = Q − R |
| **Sponsor** | Lien d'où vient un achat |
| **Inviter** | Lien d'où vient une inscription |
| **Endorser** | Membre qui recommande un produit à ajouter au Mall |
| **Global min order qty** | 120 % du minimum supplier |
| **Personal min order qty** | Minimum qu'un préordonneur peut réserver |
| **Data dictionary** | Structure clé-valeur (17+ paires) décrivant un deal |
| **Markup** | Marge ajoutée par DSM (typiquement 20 % du prix supplier) |
| **B7…B15** | Conditions booléennes déclenchant les blocs comptables |

---

# Partie II — ÉTUDE / ANALYSE CRITIQUE

## 12. Forces du projet

### 12.1 Modèle économique novateur et cohérent
- Le couplage **précommande + cryptomonnaie native** est original. Il transforme un acte d'achat en quasi-instrument financier (le tier choisi = strike price d'une option).
- L'**alignement des incitations** est bien pensé : supplier garanti d'un volume, DME rémunéré sur la conversion, endosseur sur la curation, sponsors/inviters sur la viralité.
- La répartition **30/30/30/10** est simple, équitable et lisible.
- La règle de **crystallization avec marge de sécurité de 20 %** (120 % du min supplier) anticipe intelligemment les annulations.

### 12.2 Comptabilité rigoureuse
- 9 blocs comptables couvrant l'intégralité du cycle de vie d'un deal.
- Toujours DR = CR par bloc → traçabilité parfaite.
- Distinction claire entre **fixes** (origination) et **variables** (taux DSC).
- Vérification possible automatique via la formule de balance.

### 12.3 Documentation source riche
- Formules triplées (Excel + MySQL + Solidity) → trois implémentations possibles.
- Exemples chiffrés concrets (1(a) à 1(d)) couvrant Mature, Immature, Crystallized, Cancelled, Closed, Prepaid.
- Cas limites traités explicitement : excess refund, deficiency, dispute irrésolue, supplier failed.

---

## 13. Faiblesses et risques

### 13.1 Risques juridiques majeurs
- **Qualification du DSP** : l'argument "voucher, pas crypto" est créatif mais **fragile**. Selon la jurisdiction (SEC US, AMF FR, FCA UK), un DSP irréversible adossé à un actif spéculatif pourrait être requalifié en **security** ou **e-money**. Doit être validé par un cabinet spécialisé dans **chaque juridiction cible**.
- **Tracking affiliate jusqu'au niveau 10** : structure pyramidale qui peut être assimilée à un schéma de **MLM** voire de Ponzi selon les pays (interdit en Chine, Inde, encadré strict en EU/US).
- **Plafond 100 000 $ par purchase par deal** : peut paraître généreux mais aussi attirer du **money laundering** si pas de KYC tier 2 strict.
- **Prépaiement irréversible au 60ᵉ jour** : risque de litige consommateur si le supplier ne livre pas après prépaiement (le préordonneur n'a plus de levier).

**Recommandation** : faire un audit légal pré-lancement dans chaque marché cible (USA, EU, UK, Brésil minimum) avant tout investissement majeur en dev.

### 13.2 Risques économiques

#### Volatilité du DSC
- Tout le système dépend de la **stabilité raisonnable** du DSC sur exchange.
- Si le DSC est délisté ou subit un crash > 90 %, **toutes les préordonnées immatures** deviennent inrécupérables.
- Si le DSC est manipulé (wash trading, pump & dump), DSM est exposé à des pertes énormes lors des conversions DSP → fiat.

**Mitigations recommandées** :
1. Listing multi-exchange (≥ 3) avec moyenne pondérée comme oracle prix
2. Réserve fiat de DSM = 30 % de la TVL DSP en attente (capital flottant)
3. Circuit breaker : suspension des conversions si volatilité > 20 % en 1 h
4. Stablecoin de secours (USDC/USDT) pour les périodes critiques

#### Spirale déflationnaire
- Si le DSC monte fortement, les anciens préordonneurs deviennent ultra-mature → vagues massives de closures.
- DSM doit vendre beaucoup de DSC d'un coup → **pression à la baisse** sur le DSC.
- → Risque d'auto-réalisation : la hausse déclenche les closures qui font baisser le DSC.

**Mitigations** :
1. Vente lissée sur N heures (TWAP)
2. Limites quotidiennes de conversion
3. Communication transparente avec le market maker

#### Problème de liquidité
- Si tout le monde réserve à 1000 % ou 10 000 %, peu de DSP par unité → peu de revenus DSP pour DSM.
- Si tout le monde réserve à 10 %, énormément de DSP réservés mais le moindre baisse du DSC les rend immatures.

**Recommandation** : nudge UX vers les tiers 70-150 % (sweet spot).

### 13.3 Risques techniques

| Risque | Impact | Probabilité | Mitigation |
|---|---|---|---|
| Float errors sur calculs financiers | 🔴 Critique | Élevée si pas vigilant | `Decimal`/`NUMERIC(24,8)` partout, suite de tests à 0,001 % |
| Race condition sur double dépense DSP | 🔴 Critique | Moyenne | Locks pessimistes ou advisory locks Postgres |
| Désynchronisation DSC rate / calculs | 🟠 Élevé | Élevée | Snapshot du taux au début de chaque batch |
| Backup DB compromis | 🔴 Critique | Faible | Backups chiffrés, restauration testée mensuellement |
| Phishing du masterpin | 🟠 Élevé | Moyenne | Anti-phishing UI, alertes login inhabituel |
| Smart contract bug (si Solidity utilisé) | 🔴 Critique | Élevée | Audit externe obligatoire (Trail of Bits, OpenZeppelin) |
| Exchange API down | 🟠 Élevé | Moyenne | Multi-source oracle, cache 60s |

### 13.4 Risques UX / produit

- **Complexité conceptuelle** : expliquer à un acheteur non-crypto la différence entre DSC, DSP, reservation rate, maturity, crystallization est **un défi pédagogique majeur**. Risque d'abandon élevé en onboarding.
- **Temps d'attente long** : entre la réservation et la livraison, il peut s'écouler **> 60 jours**. Pour un produit de consommation courante, c'est rédhibitoire.
- **Pas de mécanisme de rating supplier** mentionné → comment l'utilisateur sait-il s'il peut faire confiance ?
- **Affichage des 14 tiers** : sur mobile, c'est dense. Doit être repensé.

**Recommandations UX** :
1. Mode "guidé" pour les débutants (3 tiers : conservateur / neutre / spéculatif)
2. Mode "expert" pour les 14 tiers
3. Calculateur de profit/perte selon scénarios de prix DSC
4. Notation suppliers visible (étoiles + nombre de deals complétés)
5. Estimation transparente de la date de livraison probable

### 13.5 Lacunes dans le document source

| Lacune | Impact | Action requise |
|---|---|---|
| B14 et B15 non décrits | 🟠 Moyen | Clarifier avec le métier (l'Excel les détaille) |
| Pas de wireframes | 🟠 Moyen | Demander designs UX |
| Pas de cahier non-fonctionnel | 🟠 Moyen | Compléter (cf. section 9 ci-dessus) |
| Mécanique re-conversion DSP→fiat pour refunds | 🟡 Faible | Spécifier dans tech spec |
| Pas de SLA dispute interne | 🟡 Faible | Définir process + comité |
| Pas de provider KYC précisé | 🟡 Faible | Sélection en phase setup |
| BRIC vs BRL vs BRICS ambigu | 🟢 Trivial | Corriger typo |
| Tracking affiliate (cookie/wallet?) | 🟡 Faible | Choix tech à arbitrer |

---

## 14. Recommandations stratégiques

### 14.1 Phasage de développement (proposition)

#### Phase 0 — Validation (1-2 mois)
- Audit juridique pré-lancement (USA + EU + 1 marché test)
- Audit économique du modèle (modélisation Monte Carlo des taux DSC)
- Wireframes UX validés sur 5-10 utilisateurs cibles

#### Phase 1 — MVP (3-4 mois)
- Frontend + backend en mode mono-pays, mono-langue (anglais)
- Catalogue produits (sans services)
- Inscription + KYC simplifié
- Précommande + 14 tiers
- Wallet DSP + buy DSPs en USD uniquement
- Backend admin pour gérer DSC rate manuellement
- **Pas** de DME, **pas** d'purchase, **pas** d'arbre d'affiliés

#### Phase 2 — Production (2-3 mois)
- Multi-pays + i18n
- KYC complet (Onfido)
- Multi-devises (EUR, BRL)
- DME onboarding
- Purchase system
- Arbre d'affiliés Sponsor + Inviter (jusqu'au niveau 10)
- Disputes back office
- Crypto wallet pour buy DSPs en BTC/ETH

#### Phase 3 — Scale (continu)
- Services (en plus des products)
- Multi-signature suppliers
- Smart contract Solidity optionnel (si pertinent)
- Analytics avancés
- Mobile apps

### 14.2 Équipe minimum recommandée

| Rôle | Phase 1 | Phase 2 |
|---|---|---|
| Product Manager | 1 | 1 |
| Designer UX/UI | 1 | 1 |
| Dev Backend Senior (Python/FastAPI) | 1 | 2 |
| Dev Frontend Senior (Next.js) | 1 | 2 |
| Dev FullStack Junior | 0 | 1 |
| DevOps | 0,5 | 1 |
| QA | 0,5 | 1 |
| **TOTAL** | **5** | **9** |

Budget estimé Phase 1 : **120-200 K€** (selon géo de l'équipe).

### 14.3 Indicateurs de succès (KPI)

| KPI | Cible 3 mois | Cible 12 mois |
|---|---|---|
| Utilisateurs inscrits | 1 000 | 50 000 |
| Utilisateurs KYC-validés | 500 | 30 000 |
| TVL en DSP (équivalent USD) | 100 K$ | 10 M$ |
| Nombre de deals crystallisés | 5 | 200 |
| Marge brute DSM | 10 K$ | 1 M$ |
| Taux completion (deals confirmés/closés) | > 90 % | > 95 % |
| NPS | > 30 | > 50 |
| Taux annulation préordonneur | < 15 % | < 10 % |

---

## 15. Annexes

### 15.1 Cas chiffrés du document source

**Exemple 1(a)** : Création du deal Vostro 7620 le 2 mai 2023
- Prix supplier 1 500 $, min supplier 1 000 → global_min = 1 200
- Markup 20 % → deal price 1 800 $, S = 300 $
- DSC ruling rate = 0,01 $
- 14 tiers générés

**Exemple 1(b)** : Préordonneur A le 5 mai 2023 (DSC monté à 0,02)
- 20 unités à tier 90 % → reservation rate 0,018, DSPs/unit = 100 000
- O = 2 000 000 DSP réservés
- P = 1 800 000 DSP requis au nouveau taux
- T = 200 000 DSP en excès
- Status : Mature, Waiting

**Exemple 1(c)** : 8 mai 2023 (DSC descendu à 0,005)
- A devient Immature (45 000 > 0,005)
- 4 nouveaux préordonneurs B, C, D, E (400 + 150 + 210 + 720 unités)
- B et E matures → 1 120 unités matures+waiting < 1 200 → **Non-crystallized**

**Exemple 1(d)** : 13 mai 2023 (DSC remonté à 0,05)
- A : Cancelled
- B : Completed (confirme réception)
- C : Cancelled (supplier failed)
- D : Immature, Waiting
- E, F, G : Mature, F en Closed, E et G en Waiting
- H : Prepaid (60 j sans confirmation)
- Supplier deal **Crystallisé**

### 15.2 Glossaire des acronymes
- **DSM** : Digital Shopping Mall
- **DSC** : Digital Shopping Coin
- **DSP** : Digital Shopping Points
- **DME** : Digital Mall Executive
- **MOQ** : Minimum Order Quantity
- **KYC** : Know Your Customer
- **AML** : Anti Money Laundering
- **TVL** : Total Value Locked
- **TWAP** : Time-Weighted Average Price
- **MLM** : Multi-Level Marketing
- **CGU** : Conditions Générales d'Utilisation

### 15.3 Références
1. `DSM V1Final.docx` (source primaire, Drive ID `1DLYc3lDFvQhP5JzkoGRwBCnX8ZxSL5qU`)
2. `DSM Scripting Ferdinand.xlsx` (sheets 1(a)–1(d), Testing, As Transactions)
3. `DSM V1 Final.xlsx` (version comptable détaillée)
4. Implémentation prototype : repo `dsm-system/` (FastAPI + Next.js + PostgreSQL)
5. CLAUDE.md du repo (documentation technique complète du prototype, 23 sections)

---

## 16. Plan d'action immédiat

1. **Validation métier** de ce cahier des charges (1 semaine)
2. **Lever les ambiguïtés** listées en section 13.5
3. **Audit juridique pré-lancement** (2-4 semaines, en parallèle)
4. **Design UX** des écrans clés (3 semaines, en parallèle)
5. **Démarrage Phase 1** : sprint 1 (setup infra + schéma DB) sur 2 semaines
6. **Démo MVP** à 12 semaines après le sprint 1

---

*Fin du cahier des charges DSM v1.0*
