# DSM — Adaptation du business model à l'Afrique de l'Ouest

> **Document stratégique** complémentaire au `CAHIER_DES_CHARGES.md`
> Objectif : transformer DSM d'un projet "global générique" en un produit **réellement innovant et apporteur de solutions** pour le marché ouest-africain.
> **Cible géographique** : UEMOA (Sénégal, Côte d'Ivoire, Mali, Burkina, Bénin, Togo, Niger, Guinée-Bissau) + Nigeria + Ghana en phase 2.

---

## 1. Diagnostic du modèle actuel face au marché ouest-africain

### 1.1 Ce qui **ne fonctionnera pas** tel quel

| Point du modèle DSM v1 | Pourquoi ça ne marche pas en Afrique de l'Ouest |
|---|---|
| Paiement Fiat USD/EUR par carte bancaire | < 5 % de la population a une carte de crédit utilisable en ligne |
| Cryptomonnaie DSC en exchange tier | BCEAO restrictive sur la crypto, Nigeria a banni puis débanni 3 fois |
| 14 tiers de réservation avec "strike price" | Complexité inacceptable pour un public majoritairement non-financier |
| Délais 30-60 jours sans paiement intermédiaire | Population vit en flux tendu, n'attend pas 60 jours sans levier |
| KYC complet avec pièce d'identité + selfie + justificatif | Beaucoup n'ont pas de justificatif de domicile formel |
| Arbre d'affiliés Sponsor + Inviter jusqu'au niveau 10 | Risque de qualification MLM/Ponzi par les régulateurs |
| Prépaiement irréversible au supplier à 60j | Risque énorme pour le consommateur s'il n'y a pas de tribunal accessible |
| DSP non-encaissable | Inacceptable culturellement (les gens veulent pouvoir récupérer leur argent) |
| Disponibilité géographique basée sur adresse de livraison | Beaucoup vivent sans adresse formelle (quartier + descriptif) |

### 1.2 Ce qui **résonne très fort** culturellement

| Point du modèle DSM v1 | Pourquoi ça matche la culture |
|---|---|
| Précommande groupée avec seuil minimum | **C'est exactement la tontine** ! Modèle ancestral (susu/njangi/esusu) |
| Markup partagé avec endosseurs/sponsors | Économie informelle = recommandation orale = puissant |
| Achat groupé pour obtenir un prix de gros | Marchés de gros au cœur de l'économie (Sandaga, Adjamé, Onitsha) |
| Garantie de volume pour le supplier | Permet d'importer des containers entiers de Chine/Dubaï |
| Affiliation virale | WhatsApp commerce + viralité familiale = pétrole social |

**Conclusion** : le concept est **culturellement parfait**, c'est l'**implémentation** qui doit être totalement repensée.

---

## 2. Les 12 améliorations stratégiques

### 🎯 Amélioration #1 — Remplacer la dépendance crypto par une stratégie hybride

**Problème actuel** : Le DSC dépend d'un exchange tiers. C'est :
- Juridiquement risqué (BCEAO, AMF-UEMOA)
- Volatile (XOF/NGN vs USD)
- Inaccessible à 95 % de la cible (pas de wallet crypto)

**Solution proposée** :

#### Option A (recommandée pour MVP) — Voucher d'épargne collective sans crypto
- DSP = simple **token de compte interne** adossé au franc CFA (1 DSP = 1 XOF) ou stablecoin XOF
- **Aucune blockchain** dans la V1
- Émis par une **EME (Établissement de Monnaie Électronique)** licenciée BCEAO en partenariat
- Permet d'éviter complètement la qualification crypto
- Reste la mécanique de pre-order et la marge 30/30/30/10

#### Option B (phase 2) — Adossement à un stablecoin local
- Si un projet sérieux de stablecoin XOF émerge (Mansa, Jia, etc.) → s'y adosser
- Avantage : protection contre la dévaluation potentielle du XOF

#### Option C (phase 3) — Token DSC réel
- Une fois la marque établie et 100K+ utilisateurs actifs, lancement d'un véritable DSC
- Sur une chaîne low-fee (Solana, Polygon, Celo qui a une présence Africa)
- Avec un mécanisme de **stabilité fiat-backed** (réserves auditables)

> **Verdict** : la "magie spéculative" du DSC peut attendre la phase 3. L'utilité réelle est dans la précommande groupée, pas dans la spéculation crypto.

---

### 🎯 Amélioration #2 — Mobile Money en cœur du produit (PAS en option)

**Problème actuel** : Aucune mention de mobile money dans le doc source.

**Solution** :
- Intégration **dès le jour 1** avec :
  - **Wave** (leader Sénégal/Côte d'Ivoire, frais ultra-bas)
  - **Orange Money** (panafricain)
  - **MTN Mobile Money** (Côte d'Ivoire, Bénin, Ghana, Nigeria)
  - **Moov Money** (Bénin, Togo, Burkina)
  - **Free Money** (Sénégal)
- API agrégateurs disponibles : **Paydunya**, **CinetPay**, **Flutterwave**, **Hub2**
- **0 % frais utilisateur** sur les dépôts (DSM absorbe les frais opérateur ~ 1 %) → différenciation forte
- Retrait des DSP en cash via mobile money à tout moment **avant crystallization** (point bloquant à modifier vs spec actuelle)

**KPI cible** : ≥ 90 % des transactions via mobile money.

---

### 🎯 Amélioration #3 — Reformater les 14 tiers en 3 options humaines

**Problème actuel** : Demander à un commerçant d'Adjamé de choisir entre "10 % du futur taux DSC" et "10 000 % du futur taux DSC" est… inopérant.

**Solution** : Présenter **3 options** par défaut, garder les 14 en mode expert.

```
┌─────────────────────────────────────────────────────────┐
│  ⏰  EARLY BIRD                                          │
│  Économisez 25 % sur le prix Mall                       │
│  → Délai estimé 45-60 jours                             │
│  [Réserver à 75 000 XOF]                                │
├─────────────────────────────────────────────────────────┤
│  ⚖️  STANDARD                                            │
│  Prix Mall normal                                       │
│  → Délai estimé 20-30 jours                             │
│  [Réserver à 100 000 XOF]                               │
├─────────────────────────────────────────────────────────┤
│  ⚡ EXPRESS                                              │
│  Sécurisez votre place + livraison rapide               │
│  → Délai estimé 7-14 jours                              │
│  [Réserver à 115 000 XOF]                               │
└─────────────────────────────────────────────────────────┘

[ Mode expert : voir les 14 options de réservation 🔽 ]
```

**Mapping interne** :
- Early Bird = tier 70 %
- Standard = tier 100 %
- Express = tier 150 %
- Les 11 autres tiers : cachés derrière "Mode expert"

---

### 🎯 Amélioration #4 — Diaspora Bridge : tirer parti des 50 milliards de remittances

**Opportunité massive ignorée** : Les diasporas ouest-africaines envoient **~60 milliards $ /an** vers leur pays via Western Union, Wise, Sendwave, etc. La part qui finance des **biens physiques** (matériel construction, électroménager, médicaments) est énorme mais inefficace.

**Solution** : Mode "Send a deal" pour la diaspora

```
[Je suis à Paris/NYC/Toronto]
[Je veux envoyer un frigo à ma mère à Dakar]

→ Je sélectionne le produit dans le catalogue DSM Dakar
→ Je paie en EUR/USD/CAD par carte ou virement SEPA
→ Le bénéficiaire reçoit notification SMS/WhatsApp avec QR de retrait
→ Le bénéficiaire confirme la livraison sur son téléphone (même non-smartphone via USSD)
→ La diaspora reçoit confirmation
```

**Avantages** :
- **Conversion change** intégrée (DSM peut prendre 1-2 % vs 5-8 % Western Union)
- **Anti-détournement** : la diaspora ne paie pas en cash qui peut être détourné, le bien est livré directement
- **Effet réseau** : chaque diaspora-payeur amène 5-10 bénéficiaires (croissance virale ciblée)

**Marché adressable** : 2-5 % des 60 Md$ = **1-3 milliards $ /an** de TAM réaliste.

---

### 🎯 Amélioration #5 — Catégories prioritaires adaptées au contexte

Au lieu d'un catalogue générique, focaliser sur **5 verticales à forte douleur** :

| Vertical | Pourquoi parfait pour DSM | Exemples produits |
|---|---|---|
| **1. Énergie solaire** | Manque chronique d'électricité, prix unitaire élevé, importation requise | Panneaux 100W-500W, batteries lithium, kits solaires complets, lampes solaires |
| **2. Matériaux de construction** | "Faire sa maison" = objectif de vie #1, achats par lots logiques | Sacs ciment, tôles, fer à béton, carrelage, robinetterie |
| **3. Intrants agricoles** | Saisonnier, coopératives existantes, financement difficile | Semences certifiées, engrais NPK, motopompes, tracteurs occasion |
| **4. Électroménager importé** | 30-50 % moins cher qu'en magasin local, fort désir social | Frigos, télés, climatiseurs, machines à laver, smartphones |
| **5. Cérémonies (mariage, baptême, funérailles)** | Dépenses énormes ($1K-$10K), planifiées 3-6 mois à l'avance, achats groupés naturels | Pagnes de cérémonie, vaisselle, mobilier événementiel, alimentaire en gros |

**Stratégie** : ne pas être un Jumia généraliste. Être le **leader incontesté** sur ces 5 verticales.

---

### 🎯 Amélioration #6 — Mécanisme Tontine intégré

**Innovation majeure** : Au lieu de réservations strictement individuelles, permettre des **groupes de tontine** comme acteur économique.

```
[Créer une tontine d'achat]
- Nom : "Tontine Femmes de Yopougon"
- 12 membres (ajoutés par numéro mobile money)
- Cible : 12 frigos en 6 mois
- Cotisation : 30 000 XOF/mois pendant 6 mois par membre
- Rotation : 2 membres reçoivent leur frigo chaque mois

→ DSM facilite : recouvrement automatique des cotisations,
   ordre de tirage transparent,
   réservation collective au tier "Early Bird",
   sanction automatique si défaut de paiement (couvert par caution)
```

**Pourquoi c'est révolutionnaire** :
- 200M+ d'Africains de l'Ouest pratiquent la tontine
- Mais elle est **informelle, papier, vulnérable au détournement** par le secrétaire
- DSM apporte **traçabilité + paiement automatique + accès à des biens importés** que la tontine seule ne pourrait pas obtenir
- Effet réseau ultra-puissant : chaque tontine = 10-30 utilisateurs **immédiatement actifs**

---

### 🎯 Amélioration #7 — Trust as a feature (garantie anti-arnaque)

**Problème** : Le e-commerce africain souffre d'un **déficit de confiance** énorme (counterfeits, livraisons jamais reçues, qualité inférieure).

**Solution** : Le **DSM Trust Badge** intégré au modèle économique

1. **Suppliers curatés uniquement** : pas de marketplace ouvert en V1. DSM/DME pré-qualifient chaque supplier.
2. **Assurance livraison intégrée** : prélevée sur la marge S (réserve 5 % de S pour un fonds de garantie).
3. **Photo + vidéo obligatoires** à la livraison (uploadées par le livreur).
4. **Dispute en 48 h** (pas 30 jours) avec arbitrage humain accessible par WhatsApp.
5. **Garantie 14 jours satisfait ou remboursé** sur tous les produits importés.
6. **Numéro de série public** : chaque deal a un ID traçable sur le site (anti-counterfeit).

**Différenciation vs Jumia** : Jumia souffre justement de problèmes de qualité car ouvert. DSM est **fermé et garanti**.

---

### 🎯 Amélioration #8 — Hyper-local logistics & cash points

**Problème** : 90 % des Africains de l'Ouest n'ont pas d'adresse postale formelle.

**Solution** : Réseau de **points de retrait** + livraison à proximité

#### Points de retrait
- Boutiques de quartier partenaires (250 XOF/retrait au commerçant)
- Stations Total/Shell (déjà acteur en pickup pour DHL Africa)
- Bureaux Orange Money / MTN (déjà sécurisés)
- Marchés (Sandaga, Adjamé, Marché Tilène) → un guichet DSM par grand marché

#### Livraison dernière mile
- Partenariat **Yango** (Côte d'Ivoire, Sénégal)
- **Glovo** (Côte d'Ivoire, Ghana)
- **Lifi** (Dakar)
- Réseau de "DSM Champions" : entrepreneurs locaux qui livrent dans leur quartier (commission 500-2000 XOF par livraison)

#### Adressage
- Géolocalisation GPS au moment de la commande (le mobile suffit)
- **What3Words** comme alternative à l'adresse formelle
- Description vocale optionnelle ("à côté de la boulangerie Ibrahim, après le bois sacré")

---

### 🎯 Amélioration #9 — KYC progressif et accessible

**Problème** : Le KYC du doc actuel exige pièce d'identité + justificatif de domicile + selfie. **Beaucoup ne l'ont pas**.

**Solution** : KYC à 3 niveaux

| Niveau | Pré-requis | Plafond mensuel |
|---|---|---|
| **Tier 0 — Découverte** | Numéro mobile money (KYC déjà fait par l'opérateur) | 50 000 XOF (~ 80 €) |
| **Tier 1 — Standard** | + Pièce d'identité (ID, passeport, permis) via **Smile ID** ou **Youverify** (API instant) | 1 000 000 XOF (~ 1 600 €) |
| **Tier 2 — Pro** | + Selfie + référence (numéro d'un parrain Tier 1) | Illimité |

**Smile ID** ou **Youverify** sont des fournisseurs africains de KYC instantané qui couvrent toute la sous-région (~ 100-300 XOF par vérification).

---

### 🎯 Amélioration #10 — Multi-langues incluant les langues nationales

**Problème** : Spec actuelle prévoit "menu déroulant de langues" sans détail.

**Solution** : Couvrir **au minimum** :
- **Français** (UEMOA officiel)
- **Anglais** (Ghana, Nigeria, Sierra Leone, Liberia)
- **Wolof** (Sénégal, Gambie — 80 % parlent wolof avant français)
- **Bambara/Dioula** (Mali, Burkina, Côte d'Ivoire — langue commerciale du Sahel)
- **Hausa** (Niger, Nigeria nord — 80M locuteurs)
- **Yoruba** (Nigeria, Bénin, Togo — 40M)
- **Igbo** (Nigeria — 30M)

**Interface vocale** : pour les utilisateurs faiblement alphabétisés, prévoir une option **audio** pour entendre la description du produit en langue locale (TTS multilingue).

**WhatsApp Bot** : utilisateur peut consulter catalogue + commander 100 % via WhatsApp en wolof/bambara/français (Twilio Conversations API).

---

### 🎯 Amélioration #11 — Conformité réglementaire UEMOA-first

**Problème** : Spec actuelle ignore complètement le cadre BCEAO.

**Solution** : Architecture juridique optimisée

#### Partenariat avec EME (Établissement de Monnaie Électronique)
- DSM **ne demande PAS de licence bancaire** (trop coûteux, 2-5 ans)
- Partenariat avec EME licenciée BCEAO (Wave, Orange Money sont des EME)
- L'EME émet le DSP comme monnaie électronique réglementée
- DSM agit comme **agent technique et commercial**

#### Structure légale recommandée
- **Holding** au Sénégal ou Île Maurice (juridiction stable, fiscalité optimisée)
- **Filiales opérationnelles** dans chaque pays UEMOA (statut SARL/SAS local)
- **Convention BCEAO** explicite avant lancement
- Adhésion à l'**APBEF-CI** (Association des Banques et EME) pour visibilité régulateur

#### Compliance opérationnelle
- AML : monitoring transactions > 1 M XOF (rapport SOCFIN automatique)
- KYC : alignement sur **Règlement UEMOA n°09/2017/CM** sur les EME
- Protection données : alignement sur **Loi 2008-12** (Sénégal) et équivalents
- Affichage en CFA partout par défaut

#### Éviter le piège MLM
- Limiter l'arbre d'affiliés à **3 niveaux** (pas 10) → conforme à la jurisprudence française qui sert de référence dans la sous-région
- Commissions plafonnées par mois et par membre
- Reporting transparent au régulateur

---

### 🎯 Amélioration #12 — Modèle économique optimisé pour le contexte africain

**Problème** : Markup de 20 % et répartition 30/30/30/10 sont à revoir.

**Solution** : Adapter à la réalité économique africaine

#### Markup variable selon la catégorie
| Catégorie | Markup recommandé | Justification |
|---|---|---|
| Solaire | 15 % | Marges déjà serrées, valeur sociétale |
| Construction | 20 % | Standard |
| Intrants agricoles | 10 % | Sensibilité prix extrême |
| Électroménager importé | 25 % | Bien supérieur au retail local (qui prend 40-60 %) |
| Cérémonies | 30 % | Élasticité prix faible |

#### Nouvelle répartition de la marge S
```
S = 100 %
├── 30 % DSM revenue
├── 30 % Endorsement commissions (50 % endosseur, 50 % réseau Inviter L1-L3)
├── 20 % Purchase commissions (sponsor L1 50 %, sponsor L2 25 %, sponsor L3 25 %)
├── 10 % DME commission
├── 5 %  Fonds de garantie / assurance livraison
└── 5 %  Fonds de subvention sociale (panneaux solaires gratuits écoles, etc.)
```

**Innovation : les 5 % "fonds de subvention sociale"** = positionnement ESG fort, différenciation, marketing inégalable ("chaque achat finance l'électrification d'une école").

#### Pricing transparent en local
- Tout affiché en XOF/NGN/GHS par défaut
- USD en référence secondaire (pas le contraire)
- Affichage clair de la marge DSM en pourcentage ("Pourquoi ce prix ?")

---

## 3. Tableau récapitulatif des changements vs spec originale

| Aspect | DSM V1 (spec originale) | DSM V1 — Adaptation Afrique de l'Ouest |
|---|---|---|
| Devise principale | USD | XOF / NGN / GHS |
| Moyen de paiement | Carte bancaire + crypto | **Mobile money** (Wave, OM, MTN, Moov) |
| DSP support | DSC sur exchange | Voucher EME BCEAO (V1), stablecoin XOF (V2), DSC crypto (V3) |
| Tiers de réservation | 14 obligatoires | **3 par défaut** + 14 en mode expert |
| Réversibilité DSP | Irréversible | **Réversible avant crystallization** |
| Levels affiliés | 10 niveaux | **3 niveaux** (anti-MLM) |
| Délai prépaiement supplier | 60 jours irréversible | **30 jours réversible** + arbitrage 48 h |
| KYC | 1 niveau lourd | **3 niveaux progressifs** (mobile money → ID → selfie) |
| Catégories | Génériques | **5 verticales prioritaires** (solaire, construction, agri, élec, cérémonies) |
| Logistique | Adresse postale | **Points relais + GPS + What3Words + Champions DSM** |
| Langues | "Menu de langues" | **7 langues** dont wolof, bambara, hausa, yoruba |
| Diaspora | Non prévu | **"Send a deal"** depuis EU/USA/Canada |
| Tontines | Non prévu | **Module Tontine intégré** au cœur du produit |
| Conformité | Vague | **Partenariat EME BCEAO** dès le départ |
| Fonds de garantie | Non prévu | **5 % de la marge** dédiés à l'assurance livraison |
| Mission sociale | Implicite | **5 % de la marge** au fonds de subvention sociale |
| Trust | Implicite | **DSM Trust Badge** + photo/vidéo livraison + 14 j satisfait-remboursé |

---

## 4. Pourquoi DSM ainsi adapté est **vraiment innovant** pour l'Afrique de l'Ouest

### 4.1 Triple première mondiale
1. **Première plateforme de pré-commande à seuil** intégrant nativement mobile money + tontine + diaspora
2. **Première application** de la mécanique "early bird / standard / express" à des biens d'importation pour l'Afrique
3. **Premier modèle ESG-by-design** où chaque transaction finance l'électrification scolaire

### 4.2 Problèmes structurels résolus

| Problème ouest-africain | Solution DSM adaptée |
|---|---|
| Importation onéreuse (containers vides, marges abusives) | Précommande groupée → volume garanti → containers pleins → -30-50 % sur le prix final |
| Inflation et dévaluation | Voucher EME XOF protégé + option stablecoin |
| Diaspora qui paie cash et se fait avoir | "Send a deal" garantissant la livraison physique |
| Tontines vulnérables et limitées aux petites sommes | Tontine numérique sécurisée + accès aux biens d'importation |
| Lack of credit pour les ménages | Le pre-order EST un crédit gratuit avec garantie de livraison |
| Manque d'opportunités d'investissement pour la classe moyenne | DSP comme épargne projet (construction maison, mariage) |
| Counterfeit ravage l'électronique | DSM Trust Badge + numéro de série public |
| Suppliers locaux ne peuvent pas importer | DSM finance la précommande → supplier importe sans capital propre |
| Coopératives agricoles sans accès au marché | Statut "Supplier coopératif" préférentiel + commission allégée |

### 4.3 Effet multiplicateur attendu

| Indicateur | Année 1 | Année 3 | Année 5 |
|---|---|---|---|
| Utilisateurs actifs mensuels | 10 000 | 500 000 | 5 000 000 |
| TPV (Total Payment Volume) | 500 M XOF | 50 Md XOF | 500 Md XOF |
| % issus de la diaspora | 10 % | 20 % | 25 % |
| Nombre de tontines actives | 200 | 20 000 | 200 000 |
| Écoles électrifiées (fonds social) | 5 | 200 | 2 000 |
| Emplois directs DSM | 20 | 200 | 1 000 |
| Emplois indirects (champions, livreurs) | 500 | 10 000 | 100 000 |

---

## 5. Risques spécifiques au contexte africain et mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Chute brutale du XOF (rupture peg EUR) | Faible | 🔴 Critique | Réserve en USD/EUR pour 30 % de la TVL, hedging via SWAP BCEAO |
| Blackout télécom (coup d'État, Mali 2021) | Moyenne | 🟠 Élevé | Mode offline pour consultation, USSD pour transactions critiques |
| Panne mobile money | Moyenne | 🟠 Élevé | Multi-PSP redondants (≥ 3 par pays) |
| Régulateur BCEAO restreint subitement | Moyenne | 🔴 Critique | Partenariat EME licenciée + relation institutionnelle proactive |
| Bras de fer fiscal (DGI Sénégal/Côte d'Ivoire) | Élevée | 🟠 Élevé | Compliance proactive, audits externes annuels, conseiller fiscal local |
| Concurrence Jumia / Glovo qui copie | Moyenne | 🟡 Moyen | Marque + tontines + diaspora = barrières profondes |
| Tensions intercommunautaires impactant catégorie cérémonies | Faible | 🟡 Moyen | Multi-localisation, pas de dépendance à une seule communauté |
| Fraude tontine (un membre disparaît avec la caisse) | Moyenne | 🟠 Élevé | Caution mobile money obligatoire + scoring de réputation |

---

## 6. Plan de lancement pilote recommandé

### Phase pilote — 6 mois, Sénégal uniquement

**Mois 1-2** : Setup
- Partenariat Wave (Sénégal)
- Partenariat 1 EME pour l'émission DSP
- Onboarding 5 suppliers (3 solaire, 1 électroménager, 1 construction)
- Recrutement 10 DME à Dakar

**Mois 3** : Lancement bêta privée
- 500 utilisateurs invités (familles DME + DSM)
- 1 catégorie : solaire (forte douleur, faible concurrence)

**Mois 4-5** : Bêta publique Dakar
- 5 000 utilisateurs cibles
- 3 catégories (solaire + électroménager + construction)
- Première campagne diaspora ciblée (France, USA)

**Mois 6** : Évaluation et préparation scale
- Si > 1 000 deals crystallisés et NPS > 40 → expansion Abidjan en mois 7

### Phase scale — Mois 7-18
- Mois 7 : Abidjan
- Mois 9 : Bamako, Cotonou, Lomé
- Mois 12 : Niamey, Ouagadougou
- Mois 15 : Accra (anglophone)
- Mois 18 : Lagos (Nigeria, pivot stratégique)

### Budget pilote estimé : **150-250 M XOF** (250-400 K €)
- Dev produit : 80 M (50 %)
- Marketing pilote : 30 M (15 %)
- Opérations + équipe : 50 M (30 %)
- Légal + compliance : 20 M (10 %)
- Réserve garantie : 20 M (10 %)

---

## 7. Conclusion : le projet réinventé

**DSM original** = un Mall avec une mécanique crypto complexe pour un marché global indéfini.

**DSM ouest-africain** = la **première super-app de précommande groupée** qui résout simultanément :
- L'inaccessibilité des biens d'importation
- L'inefficacité des remittances de la diaspora
- La vulnérabilité des tontines informelles
- Le déficit de confiance e-commerce
- L'exclusion bancaire (via mobile money first)
- Le manque de financement projet pour la classe moyenne
- Le déficit d'infrastructure (5 % de la marge à l'électrification scolaire)

C'est un projet qui peut **vraiment** atteindre 10 millions d'utilisateurs en 5 ans **et** générer un impact social mesurable, là où la version originale risque de rester un projet de niche pour cryptophiles avertis.

---

*Document complémentaire au `CAHIER_DES_CHARGES.md` — version 1.0 — 2026-05-18*
