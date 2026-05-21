# DSM -- Digital Shopping Mall

## Context file for Claude Code

> This file contains ALL business, accounting, and technical context for the DSM project.
> Claude Code MUST read this file before making any code changes.
> Source of truth: Google Sheet "DSM Scripting Ferdinand"
>
> **Document version:** 2.2 (Markup split corrected: Recommendation 20 % / Purchase 30 % / Leader Pool 10 %)
> **Last updated:** 2026-05-19

---

## 1. Project Overview

**DSM (Digital Shopping Mall)** is a pre-order marketplace built on a proprietary cryptocurrency (DSC).
This repository is a **test prototype** of the economic model -- its purpose is to validate the automated
accounting journal entries derived from the Excel file "DSM Scripting Ferdinand" (Google Sheet).

The Google Sheet contains multiple tabs:
- **Sheet 1(a)** -- DSC rate = $0.01 (14 tiers, basic tier table)
- **Sheet 1(b)** -- DSC rate = $50,000 (MAIN REFERENCE scenario)
- **Sheet 1(c)** -- DSC rate = $0.005 (low-rate scenario, produces deficiency)
- **Testing sheet** -- Three test scenarios with journal entries (1(b), 1(c), 1(d))

**Reference product across all sheets:**
- Product: Vostro 7620 Dell laptop
- Supplier minimum order: 1,200 units
- Supplier price: $1,500
- Deal price: $1,800
- Markup: $300 (20%)

---

## 2. Technical Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + SQLAlchemy + PostgreSQL |
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Infrastructure | Docker Compose |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| State management | Zustand (frontend) |
| Precision | Python `Decimal` with 8 decimal places |

**Launch:**
```bash
docker-compose down && docker-compose up --build
```
- Frontend: http://localhost:3000
- API Swagger: http://localhost:8000/docs
- PostgreSQL: localhost:5432 (user: dsm, pass: dsm_secret, db: dsm_db)

---

## 3. The Three Monetary Entities

| Entity | Full Name | Description |
|--------|-----------|-------------|
| **DSC** | Digital Shopping Coin | Cryptocurrency traded on crypto markets. Has a ruling rate (H) in USD. |
| **DSP** | Digital Shopping Points | Converted from DSC at 1:1 ratio. Conversion is **irreversible**. Used for reservations. |
| **Fiat** | USD | Traditional currency. Used to pay suppliers and DME (when B15=1). |

---

## 4. Table 1(a) -- 14 Reservation Tiers

Each product has **14 tiers** calculated from the current DSC ruling rate (H).

| # | Tier % | Reservation Rate Formula | DSPs/unit Formula | Description |
|---|--------|-------------------------|-------------------|-------------|
| 1 | 10% | 0.10 x H | deal_price / (0.10 x H) | Lowest tier, most DSPs needed |
| 2 | 50% | 0.50 x H | deal_price / (0.50 x H) | |
| 3 | 70% | 0.70 x H | deal_price / (0.70 x H) | |
| 4 | 90% | 0.90 x H | deal_price / (0.90 x H) | |
| 5 | 100% | 1.00 x H | deal_price / (1.00 x H) | At-market rate |
| 6 | 120% | 1.20 x H | deal_price / (1.20 x H) | |
| 7 | 150% | 1.50 x H | deal_price / (1.50 x H) | |
| 8 | 200% | 2.00 x H | deal_price / (2.00 x H) | |
| 9 | 250% | 2.50 x H | deal_price / (2.50 x H) | |
| 10 | 300% | 3.00 x H | deal_price / (3.00 x H) | |
| 11 | 500% | 5.00 x H | deal_price / (5.00 x H) | |
| 12 | 800% | 8.00 x H | deal_price / (8.00 x H) | |
| 13 | 1000% | 10.00 x H | deal_price / (10.00 x H) | |
| 14 | 10000% | 100.00 x H | deal_price / (100.00 x H) | Highest tier, fewest DSPs needed |

**USD Equivalent** for each tier: `dsc_ruling_rate x dsps_per_unit`

Code location: `backend/app/routers/products.py` -- `TIER_PERCENTAGES` array and `build_options()` function.

---

## 5. Table 1(b) -- Reference Scenario (DSC rate = $50,000)

This is the MAIN REFERENCE used for validation. DSP balance = 1.200000.

| Tier | Reservation Rate | DSPs/unit | USD Equivalent |
|------|-----------------|-----------|---------------|
| 10% | 5,000 | 0.360000 | 18,000 |
| 50% | 25,000 | 0.072000 | 3,600 |
| 70% | 35,000 | 0.051429 | 2,571.43 |
| 90% | 45,000 | 0.040000 | 2,000 |
| 100% | 50,000 | 0.036000 | 1,800 |
| 120% | 60,000 | 0.030000 | 1,500 |
| 150% | 75,000 | 0.024000 | 1,200 |
| 200% | 100,000 | 0.018000 | 900 |
| 250% | 125,000 | 0.014400 | 720 |
| 300% | 150,000 | 0.012000 | 600 |
| 500% | 250,000 | 0.007200 | 360 |
| 800% | 400,000 | 0.004500 | 225 |
| 1000% | 500,000 | 0.003600 | 180 |
| 10000% | 5,000,000 | 0.000360 | 18 |

**Verification formula:** `reservation_rate = tier_pct x H` and `dsps_per_unit = deal_price / reservation_rate`

Example at 90% tier: `reservation_rate = 0.90 x 50,000 = 45,000` and `dsps_per_unit = 1,800 / 45,000 = 0.040000`

---

## 6. Data Dictionary -- All Variables

### Fixed Variables (set at reservation time, never change)

| Variable | Name | Formula | Description |
|----------|------|---------|-------------|
| **O** | Reserved DSPs (total) | `reserved_units x dsps_per_unit` | Total DSPs locked at reservation |
| **Q** | Deals value | `reserved_units x deal_price` | Total deal value in USD |
| **R** | Suppliers value | `reserved_units x supplier_price` | Total supplier cost in USD |
| **S** | Deals markup | `Q - R` | Total markup (profit margin) |

### Variable Fields (recalculated when DSC rate changes)

| Variable | Name | Formula | Description |
|----------|------|---------|-------------|
| **H** | DSC ruling rate | Set by admin (H4 in sheet) | Current DSC price in USD |
| **H0** | Original reservation rate | `tier_pct x H_at_reservation_time` | Rate when reservation was made (fixed) |
| **H1** | Current reservation rate | `tier_pct x H_current` | Rate based on current DSC price |
| **P** | Requisite DSPs (total) | `reserved_units x (deal_price / H)` | DSPs needed at current rate |
| **T** | Excess DSPs | `max(O - P, 0)` | Surplus DSPs (positive = good) |
| **U** | Deficiency DSPs | `max(P - O, 0)` | DSP shortfall (positive = bad) |

### Key Relationship: Excess vs Deficiency

```
When O > P  -->  Excess = O - P      (preorderer has surplus DSPs)
When O < P  -->  Deficiency = P - O  (preorderer has a DSP shortfall)
When O = P  -->  Both are zero        (exact match)
```

The sheet shows deficiency in parentheses: `(359,999.960000)` means a deficiency of 359,999.960000 DSPs.

---

## 7. Conditions B7 to B15 -- Exact Descriptions from Sheet

### Boolean Conditions (0 or 1) -- trigger accounting blocs

| Condition | Exact Description from Sheet | Applies to | Bloc Triggered |
|-----------|------------------------------|-----------|---------------|
| **B7** | "When a preorderer cancels the deal" | PREORDER | CANCELLATION |
| **B8** | "When the reserved DSPs are sold to close the deal or when the supplier's deal that is fully payable by DSPs becomes crystallized" | PRODUCT | CLOSURE |
| **B9** | "When the supplier fails to deliver after the deal is closed" | PRODUCT | SUPPLIER_FAILED |
| **B10** | "When the system pays the supplier in advance" | PRODUCT | PREPAYMENT |
| **B11** | "When a preorderer confirms the receipt of the reserved product/service" | PREORDER | COMPLETION |
| **B12** | "When the preorderer confirms the receipt of the prepaid deal" | PREORDER | PREPAID_COMPLETION |
| **B13** | "When DSM fails to judge the dispute" | PREORDER | DSM_FAILED |

### Configuration Parameters

| Parameter | Exact Description from Sheet | Default | Values |
|-----------|------------------------------|---------|--------|
| **B14** | "Percentage of Supplier's payment in DSPs" | 10% (0.10) | 0.00 to 1.00 |
| **B15** | "DME payment option (0=DSP, 1=Fiat)" | 1 (Fiat) | 0 = DSP, 1 = Fiat |

---

## 8. Accounting Engine -- All 9 Blocs with Exact Formulas

> Source file: `backend/app/accounting.py`
> Precision: Python Decimal with 8 decimal places (zero float error)
> Each IF() corresponds to an exact Excel cell in the sheet.

### BLOC 0 -- BUY_DSPS (Buying DSPs by the user)

This bloc is tracked as an event type but journal entries are generated when DSPs are purchased.
The user converts DSC to DSP (irreversible 1:1 conversion).

### BLOC 1 -- ORIGINATION (Origination of reservation) -- ALWAYS generated

```
DR  Preorder's voucher Liability (code 2141)  = O
CR  Preorder Liabilities (code 2010)            = O
```

Locks the reserved DSPs from the preorderer's wallet into the reservation account.

### BLOC 2 -- CANCELLATION (B7=1: When a preorderer cancels the deal)

```
DR  Preorder Liabilities (code 2010)              = IF(B7, O, 0)
CR  Preorder's voucher Liability (code 2141)      = IF(B7, O, 0)
```

Reverses the origination -- returns all reserved DSPs to the preorderer.

### BLOC 3 -- CLOSURE (B8=1: When reserved DSPs are sold to close the deal)

```
DR  Preorder Liabilities (code 2010)   = IF(B8, O)
CR  Supplier Escrow Liability Fiat (code 2021)   = IF(B8, R x (1 - B14))
CR  Supplier's Voucher Liability (code 2142)     = IF(B8, R/Q x P x B14)
CR  DSM margin payable (code 2120)                      = IF(B8, S/Q x P x 30%)
CR  DME Commission payable (DSP)            = IF(B8 AND NOT B15, S/Q x P x 10%)
CR  DME Commission payable (Fiat)           = IF(B8 AND B15, S x 10%)
CR  Members' commissions payable            = IF(B8, S/Q x P x 60%)
CR  Preorder's voucher Liability (code 2141) (excess) = IF(B8 AND T > 0, T)
```

### BLOC 4 -- SUPPLIER_FAILED (B9=1: When the supplier fails to deliver)

```
DR  Supplier Escrow Liability Fiat (code 2021)   = IF(B9, R x (1 - B14))
DR  Supplier's Voucher Liability (code 2142)     = IF(B9, R/Q x P x B14)
DR  DSM margin payable (code 2120)                      = IF(B9, S/Q x P x 30%)
DR  DME Commission payable (DSP)            = IF(B9 AND NOT B15, S/Q x P x 10%)
DR  DME Commission payable (Fiat)           = IF(B9 AND B15, S x 10%)
DR  Members' commissions payable            = IF(B9, S/Q x P x 60%)
CR  Preorder's voucher Liability (code 2141)     = [sum of all DSP debits above]
CR  Preorderer's USD payments               = [sum of all USD debits above]
```

Reverses the closure -- returns everything to the preorderer.

### BLOC 5 -- PREPAYMENT (B10=1: When the system pays the supplier in advance)

```
DR  Supplier Prepayment (code 1301)        = IF(B10, R x (1 - B14))
DR  Supplier Prepayment (code 1301)        = IF(B10, R/Q x P x B14)
DR  Other Prepayment (code 1302)               = IF(B10 AND NOT B15, S/Q x P x 10%)
DR  Other Prepayment (code 1302)               = IF(B10 AND B15, S x 10%)
CR  DSM USD wallet (Supplier payment)       = IF(B10, R x (1 - B14))
CR  DSM USD wallet (DME payment)            = IF(B10 AND B15, S x 10%)
CR  Supplier's DSP wallet                   = IF(B10, R/Q x P x B14)
CR  DME's DSP wallet                        = IF(B10 AND NOT B15, S/Q x P x 10%)
```

### BLOC 6 -- COMPLETION (B11=1: When preorderer confirms receipt)

```
DR  Supplier Escrow Liability Fiat (code 2021)   = IF(B11, R x (1 - B14))
DR  Supplier's Voucher Liability (code 2142)     = IF(B11, R/Q x P x B14)
DR  DSM margin payable (code 2120)                      = IF(B11, S/Q x P x 30%)
DR  DME Commission payable (DSP)            = IF(B11 AND NOT B15, S/Q x P x 10%)
DR  DME Commission payable (Fiat)           = IF(B11 AND B15, S x 10%)
DR  Members' commissions payable            = IF(B11, S/Q x P x 60%)
CR  DSM USD account (Supplier payment)      = IF(B11, R x (1 - B14))
CR  Supplier's DSP wallet                   = IF(B11, R/Q x P x B14)
CR  DSM revenue                             = IF(B11, S/Q x P x 30%)
CR  DME DSP wallet                          = IF(B11 AND NOT B15, S/Q x P x 10%)
CR  DSM USD account (DME payment)           = IF(B11 AND B15, S x 10%)
CR  Recommendation Commission               = IF(B11, S/Q x P x 20%)
CR  Purchase commissions (code 2130)        = IF(B11, S/Q x P x 30%)
CR  Leader Pool Monthly Payable (code 2160)                    = IF(B11, S/Q x P x 10%)
```

### BLOC 7 -- PREPAID_COMPLETION (B10=1 AND B12=1: Completing a prepaid deal)

```
DR  Supplier Escrow Liability Fiat (code 2021)   = IF(B10 AND B12, R x (1 - B14))
DR  Supplier's Voucher Liability (code 2142)     = IF(B10 AND B12, R/Q x P x B14)
DR  DSM margin payable (code 2120)                      = IF(B10 AND B12, S/Q x P x 30%)
DR  DME Commission payable (DSP)            = IF(B12 AND NOT B15, S/Q x P x 10%)
DR  DME Commission payable (Fiat)           = IF(B12 AND B15, S x 10%)
DR  Members' commissions payable            = IF(B10 AND B12, S/Q x P x 60%)
CR  Supplier Prepayment (code 1301)        = IF(B10 AND B12, R x (1 - B14))
CR  Supplier Prepayment (code 1301)        = IF(B10 AND B12, R/Q x P x B14)
CR  Other Prepayment (code 1302)               = IF(B12 AND NOT B15, S/Q x P x 10%)
CR  Other Prepayment (code 1302)               = IF(B10 AND B15, S x 10%)
CR  DSM revenues                            = IF(B10 AND B12, S/Q x P x 30%)
CR  Recommendation Commission               = IF(B10 AND B12, S/Q x P x 20%)
CR  Purchase commissions (code 2130)        = IF(B10 AND B12, S/Q x P x 30%)
CR  Leader Pool Monthly Payable (code 2160)                    = IF(B10 AND B12, S/Q x P x 10%)
```

### BLOC 8 -- DSM_FAILED (B13=1: When DSM fails to judge the dispute)

```
DR  Supplier's expense account (USD)        = IF(B13, R x (1 - B14))
DR  Supplier's expense account (DSP)        = IF(B13, R/Q x P x B14)
CR  Supplier's USD wallet                   = IF(B13, R x (1 - B14))
CR  Supplier's DSP wallet                   = IF(B13, R/Q x P x B14)
```

---

## 8.bis. Chart of Accounts (codes comptables officiels)

> Tous les comptes utilisés dans l'engine `accounting.py` sont alignés sur ce plan.
> Source de vérité : back-office comptable DSM (capture Active accounts).

### ASSETS (1xxx)

| Code | Account name | Currency | Used in |
|------|-------------|----------|---------|
| 1300 | Prepayments *(parent)* | — | — |
| 1301 | └ **Supplier Prepayment** | USD or DSP | PREPAYMENT (DR), PREPAID_COMPLETION (CR) |
| 1302 | └ **Other Prepayment** *(DME)* | USD or DSP | PREPAYMENT (DR), PREPAID_COMPLETION (CR) |

### LIABILITIES (2xxx)

| Code | Account name | Currency | Used in |
|------|-------------|----------|---------|
| 2010 | **Preorder Liabilities** | DSP | ORIGINATION (CR), CANCELLATION (DR), CLOSURE (DR) |
| 2020 | Supplier Escrow Liabilities *(parent)* | — | — |
| 2021 | └ **Supplier Escrow Liability Fiat** | USD/EUR/... | CLOSURE (CR), SUPPLIER_FAILED (DR), COMPLETION (DR), PREPAID_COMPLETION (DR) |
| 2120 | **DSM margin payable** | DSP | CLOSURE (CR), SUPPLIER_FAILED (DR), COMPLETION (DR), PREPAID_COMPLETION (DR) |
| 2130 | **Purchase commissions** | DSP | COMPLETION (CR **30 %**), PREPAID_COMPLETION (CR **30 %**) |
| 2140 | Voucher Liability *(parent)* | — | — |
| 2141 | └ **Preorder's voucher Liability** | DSP | ORIGINATION (DR), CANCELLATION (CR), CLOSURE excess (CR), SUPPLIER_FAILED refund (CR) |
| 2142 | └ **Supplier's Voucher Liability** | DSP | CLOSURE (CR), SUPPLIER_FAILED (DR), COMPLETION (DR), PREPAID_COMPLETION (DR) |
| 2160 | **Leader Pool Monthly Payable** | DSP | COMPLETION (CR **10 %**), PREPAID_COMPLETION (CR **10 %**) |

### Comptes non encore codifiés (à coder ultérieurement)

| Current name | Suggested next code | Rationale |
|---|---|---|
| `Recommendation Commission` | TBD (e.g. 2125) | Member commission accrual, **20 % of S** (L1 to L10 of buyer's invitation tree — à comptabiliser **par utilisateur**) |
| `Members' commissions payable` | TBD (e.g. 2150) | Aggregated 60 % accrual in CLOSURE / SUPPLIER_FAILED |
| `DME Commission payable (DSP)` and `(Fiat)` | TBD | DME accrual, 10 % of S |
| `DME DSP wallet` | TBD | DME's settled DSP balance |
| `DSM USD account (Supplier payment)` / `(DME payment)` | TBD | DSM USD operating account |
| `DSM USD wallet (Supplier payment)` / `(DME payment)` | TBD | DSM USD pre-payment account |
| `DSM revenue` / `DSM revenues` | TBD (need unification) | Revenue line, 30 % of S |
| `Supplier's DSP wallet` | TBD | Supplier settled DSP balance |
| `Supplier's USD wallet` | TBD | Supplier settled USD balance |
| `Supplier's expense account (USD)` / `(DSP)` | TBD | DSM_FAILED counterpart |
| `Preorderer's USD payments` | TBD | USD refund destination |
| `DSM Fiat currency account` | TBD | BUY_DSPS DR side |
| `Depositor's DSP wallet` | TBD | BUY_DSPS CR side |

⚠️ Petite incohérence à corriger côté code : `DSM revenue` (COMPLETION) vs `DSM revenues` (PREPAID_COMPLETION). À unifier.

### Future evolution -- 2160 Leader Pool Monthly Payable (sous-comptes prévus)

D'après les notes de meeting, le compte 2160 doit être décomposé en :

| Sub-account (planned) | Currency | Description |
|---|---|---|
| **DFM Pool Withdrawal fees** | DSP/USD | Frais de retrait collectés |
| **DFM Pool KYC fees** | USD | Frais KYC collectés (en fiat) |
| **DFM Pool (DSP holdings)** | DSP | Solde DSP du pool en attente de distribution |

**Per-user accounting** : le Leader Pool Monthly Payable et la Recommendation Commission doivent
être écrits **par bénéficiaire** (1 ligne par utilisateur dans l'arbre d'invitation L1 à L10),
au lieu d'une ligne agrégée. Implique :
- Une table `commission_ledger(user_id, level, preorder_id, account_code, amount, ...)`
- Un job qui, à chaque COMPLETION/PREPAID_COMPLETION, remonte les arbres Sponsor et Inviter
  du buyer et crée N lignes (jusqu'à 10) au lieu d'une seule
- Un mécanisme de cap (100 000 $ par endorsement) à appliquer ligne par ligne

Estimation : ~1-2 jours de dev (modèles, fan-out logic, tests).

---

## 9. Markup Distribution (S = Deals Markup)

The markup S is split **30 / 30 / 20 / 10 / 10** (total 100 %):

| Recipient | % of Markup | Formula (DSP-based) | Formula (Fiat for DME) |
|-----------|-------------|---------------------|----------------------|
| DSM revenue | 30% | `S/Q x P x 30%` | `S/Q x P x 30%` |
| Recommendation Commission | 20% | `S/Q x P x 20%` | `S/Q x P x 20%` |
| Purchase commissions (code 2130) | 30% | `S/Q x P x 30%` | `S/Q x P x 30%` |
| Leader Pool Monthly Payable (code 2160) | 10% | `S/Q x P x 10%` | `S/Q x P x 10%` |
| DME commission | 10% | `S/Q x P x 10%` (if B15=0) | `S x 10%` (if B15=1) |

**Members' commissions payable** (used in CLOSURE and SUPPLIER_FAILED as a single accrual line)
= Recommendation Commission (20 %) + Purchase commissions (30 %) + Leader Pool Monthly Payable (10 %) = **60 %** of S/Q x P.

In COMPLETION and PREPAID_COMPLETION blocs, this 60 % is split into the three component accounts above.

**Critical note:** The 90 % DSP share (30 + 30 + 20 + 10) is calculated on the DSP-equivalent basis
(`S/Q x P`), NOT on the raw markup S. Only the DME fiat commission (when B15=1) uses the raw `S x 10%`.

The factor `S/Q x P` adjusts the markup proportionally: `(markup/deal_value) x requisite_dsps`.

---

## 10. Maturity Rule

```
IF original_reservation_rate <= dsc_ruling_rate  -->  "Mature"
ELSE                                              -->  "Immature"
```

Where:
- `original_reservation_rate` = `tier_pct x H_at_reservation_time` (H0, fixed at reservation)
- `dsc_ruling_rate` = current DSC rate (H, changes over time)

**Verification from sheet:**
- 1(b): Reserved Rate 45,000 <= DSC rate 50,000 --> **Mature** (correct)
- 1(c): Reserved Rate 45,000 > DSC rate 0.005 --> **Immature** (correct)

**Code location:** `backend/app/routers/preorders.py` -- `_recompute_variable_fields()` function.

**Note:** The code currently compares `orig_rate <= dsc_rate` where `orig_rate` is the
`original_reservation_rate` (= `tier_pct x H_original`). This matches the sheet behavior.

---

## 11. Crystallization Rule

A deal **crystallizes** when:
```
SUM(reserved_units for preorders that are Mature AND in status Waiting) >= global_min_order
```

Where `global_min_order = supplier_min_order x 1.20` (120% of supplier minimum).

For the reference product: `global_min_order = 1,200 x 1.20 = 1,440` units.

**Code location:** `backend/app/routers/admin.py` -- `crystallization_status()` endpoint.

Crystallization statuses:
- `NonCrystallized` -- not enough mature+waiting units
- `Crystallized` -- threshold reached

---

## 12. Deal Status Flow

```
                   Originated
                      |
                      v
                   Waiting
                  /   |   \
                 /    |    \
                v     v     v
          Cancelled  Closed  DSMFailed
                      |
                      v
                   Prepaid
                      |
                      v
                  Completed
```

Alternatively, `Waiting --> SupplierFailed` (after closure, if B9=1).

| Status | Trigger Condition |
|--------|------------------|
| `Waiting` | Default after origination |
| `Cancelled` | B7 = 1 |
| `Closed` | B8 = 1 |
| `SupplierFailed` | B9 = 1 |
| `Prepaid` | B10 = 1 |
| `Completed` | B11 = 1 OR (B10 = 1 AND B12 = 1) |
| `DSMFailed` | B13 = 1 |

**Code location:** `backend/app/routers/preorders.py` -- `_update_deal_status()` function.

---

## 13. Testing Sheet Scenarios -- Expected Values for Verification

### Scenario 1(b) -- MATURE + EXCESS (1 unit, DSC rate = $50,000)

| Field | Value |
|-------|-------|
| Serial | 1000000001 |
| Tier | 90% |
| Reserved Rate (H0) | 45,000 |
| Current Rate (H1) | 45,000 |
| DSC ruling rate (H) | 50,000 |
| Supplier price | $1,500 |
| Deal price | $1,800 |
| Units | 1 |
| Reserved DSPs/unit | 0.040000 |
| DSPs needed/unit | 0.036000 |
| **O** (Reserved DSPs) | 0.040000 |
| **P** (Requisite DSPs) | 0.036000 |
| **Q** (Deal value) | $1,800 |
| **R** (Supplier value) | $1,500 |
| **S** (Markup) | $300 |
| **T** (Excess) | 0.004000 |
| **U** (Deficiency) | 0 |
| Maturity | **Mature** (45,000 <= 50,000) |
| Crystallization | NonCrystallized |
| Status | Waiting |

### Scenario 1(c) -- IMMATURE + DEFICIENCY (1 unit, DSC rate = $0.005)

| Field | Value |
|-------|-------|
| Serial | 1000000001 |
| Tier | 90% |
| Reserved Rate (H0) | 45,000 |
| Current Rate (H1) | 0.004500 |
| DSC ruling rate (H) | 0.005000 |
| Units | 1 |
| Reserved DSPs/unit | 0.040000 |
| DSPs needed/unit | 360,000.000000 |
| **O** (Reserved DSPs) | 0.040000 |
| **P** (Requisite DSPs) | 360,000.000000 |
| **T** (Excess) | 0 |
| **U** (Deficiency) | **(359,999.960000)** |
| Maturity | **Immature** (45,000 > 0.005) |
| Crystallization | NonCrystallized |
| Status | Waiting |

### Scenario 1(d) -- MATURE + CRYSTALLIZED + CANCELLED (5 units)

| Field | Value |
|-------|-------|
| Tier | 90% |
| Reserved Rate (H0) | 42,812.784 |
| Current Rate (H1) | 42,812.784 |
| DSC ruling rate (H) | 47,569.76 |
| Supplier price | $5,000 |
| Deal price | $6,000 |
| Units | 5 |
| Reserved DSPs/unit | 0.140145 |
| DSPs needed/unit | 0.126131 |
| **O** (Reserved DSPs) | 0.700725 |
| **P** (Requisite DSPs) | 0.630653 |
| **Q** (Deal value) | $30,000 |
| **R** (Supplier value) | $25,000 |
| **S** (Markup) | $5,000 |
| **T** (Excess) | 0.070073 |
| Maturity | **Mature** (42,812.784 <= 47,569.76) |
| Crystallization | **Crystallized** |
| Status | **Cancelled** |

### Testing Sheet Journal Entries (B9=1, Supplier fails, 1 unit scenario)

With B14 = 10% (0.10) and B15 = 1 (Fiat), when B9=1:

| Account | DR/CR | Amount |
|---------|-------|--------|
| Supplier Escrow Liability Fiat (code 2021) | DR | 22,500.00 |
| Supplier's DSP escrow | DR | 0.052554 |
| DSM margin payable (code 2120) | DR | 0.031533 |
| DME Commission in DSPs | DR | 0.000000 (B15=1, so zero) |
| DME Commission in Fiat | DR | 500.000000 |
| Members' commissions (DSPs) | DR | 0.063065 |
| Preorder's voucher Liability (code 2141) | CR | 0.147152 |
| Preorderer's USD payments | CR | 23,000.00 |

---

## 14. Seed Data (built into the system)

The `/admin/seed` endpoint creates test data matching the sheet:

| Entity | Details |
|--------|---------|
| Test buyer | email: `buyer@dsm.test`, password: `buyer123`, DSP balance: 1.200000 |
| Product 1 | Vostro 7620 Dell laptop -- $1,500 / $1,800, min 1,000 (global 1,200), H = $50,000 |
| Product 2 | MacBook Pro 14" -- $1,800 / $2,200, min 500 (global 600), H = $50,000 |
| Product 3 | iPhone 15 Pro Max -- $900 / $1,100, min 2,000 (global 2,400), H = $50,000 |
| Product 4 | Samsung Galaxy S24 Ultra -- $800 / $990, min 1,500 (global 1,800), H = $50,000 |
| Test preorder | 20 units, tier 90%, B8=1 (Closed), Mature |

Seed preorder expected values (20 units, tier 90%, H=$50,000):
- O = 0.800000, P = 0.720000, Q = $36,000, R = $30,000, S = $6,000, T = 0.080000

---

## 15. Complete Project Structure

```
dsm-system/
|-- CLAUDE.md                          # THIS FILE -- business + technical context
|-- docker-compose.yml                 # Docker orchestration (postgres + backend + frontend)
|-- README.md
|
|-- backend/
|   |-- Dockerfile
|   |-- requirements.txt               # Python deps (FastAPI, SQLAlchemy, bcrypt, etc.)
|   |-- app/
|       |-- __init__.py
|       |-- main.py                    # FastAPI app entry point + CORS + router mounting
|       |-- database.py                # SQLAlchemy engine + session factory
|       |-- models.py                  # ORM models: User, Product, ReservationOption, Preorder, JournalEntry
|       |-- schemas.py                 # Pydantic request/response schemas
|       |-- auth.py                    # JWT creation/validation + bcrypt password hashing
|       |-- accounting.py             # >>> ACCOUNTING ENGINE <<< -- DO NOT modify without checking section 8
|       |-- routers/
|           |-- __init__.py
|           |-- auth.py                # /auth/register, /auth/login, /auth/me
|           |-- products.py            # /products/ CRUD + tier generation (Table 1a)
|           |-- preorders.py           # /preorders/ creation + conditions + journal + validation
|           |-- admin.py               # /admin/ users, topup, seed, crystallization, delete
|
|-- frontend/
|   |-- Dockerfile
|   |-- package.json                   # Next.js 14, React 18, Tailwind, Zustand, Radix UI
|   |-- next.config.js                 # API proxy rewrites to backend
|   |-- tailwind.config.js
|   |-- postcss.config.js
|   |-- tsconfig.json
|   |-- src/
|       |-- lib/
|       |   |-- api.ts                 # Axios client + Zustand auth store + JWT interceptor
|       |-- components/
|       |   |-- Layout.tsx             # Global layout with navbar
|       |-- styles/
|       |   |-- globals.css            # Tailwind base + custom theme (gold/onyx)
|       |-- pages/
|           |-- _app.tsx               # Next.js app wrapper
|           |-- index.tsx              # Store page -- product catalog + Table 1(b) + pre-order form
|           |-- login.tsx              # Login page
|           |-- register.tsx           # Registration page
|           |-- dashboard.tsx          # User's pre-orders list
|           |-- api/[...path].ts       # Next.js API proxy to backend
|           |-- preorders/
|           |   |-- [id].tsx           # Pre-order detail + journal entries + admin panel
|           |-- admin/
|               |-- index.tsx          # Admin dashboard
|               |-- users.tsx          # Admin user management
```

---

## 16. API Endpoints Reference

### Authentication (`/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Create user account |
| POST | `/auth/login` | None | Login, returns JWT + user |
| GET | `/auth/me` | JWT | Get current user info |

### Products (`/products`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products/` | None | List active products with tiers |
| GET | `/products/{id}` | None | Get single product |
| POST | `/products/` | Admin | Create product + generate 14 tiers |
| PUT | `/products/{id}/dsc-rate` | Admin | Update DSC rate, regenerate tiers |

### Pre-orders (`/preorders`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/preorders/` | JWT | Create pre-order (debits DSP wallet) |
| GET | `/preorders/` | JWT | List my pre-orders |
| GET | `/preorders/all` | Admin | List ALL pre-orders |
| GET | `/preorders/{id}` | JWT | Get pre-order detail |
| PUT | `/preorders/{id}/conditions` | Admin | Update B7-B15 + DSC rate, regenerate journal |
| GET | `/preorders/{id}/validate` | Admin | Check DR=CR balance per bloc |
| GET | `/preorders/{id}/journal` | JWT | Get journal entries (optional `?event_type=` filter) |
| DELETE | `/preorders/{id}` | JWT (owner or admin) | Delete preorder + cascade journal entries. Refunds reserved DSPs to wallet if `deal_status` is `Waiting`/`Cancelled`/`DSMFailed` |

### Admin (`/admin`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/users` | Admin | List all users |
| POST | `/admin/topup` | Admin | Add DSP/USD to user wallet |
| POST | `/admin/seed` | Admin | Seed test data (idempotent) |
| DELETE | `/admin/users/{id}` | Admin | Delete user + cascade preorders |
| DELETE | `/admin/products/{id}` | Admin | Delete product + cascade |
| GET | `/admin/crystallization/{product_id}` | Admin | Check crystallization status |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | None | API status |
| GET | `/health` | None | Health check |

---

## 17. Important Rules for Claude Code

1. **NEVER modify `accounting.py`** without verifying the corresponding formula in section 8 of this file.
   Each IF() corresponds to a specific Excel cell. Cross-reference before any change.

2. **ALWAYS use `Decimal`** (never `float`) for all monetary calculations in Python backend code.
   Import from `decimal` module. Use `Decimal(str(value))` for conversions.

3. **Precision target**: margin of error < 0.001% on all accounting calculations.
   The system uses 8 decimal places: `Decimal("0.00000001")` (PREC constant).

4. **The `/preorders/{id}/conditions` endpoint** regenerates the ENTIRE journal on every call.
   This is intentional -- it ensures consistency. Old entries are deleted and recreated.

5. **The `/preorders/{id}/validate` endpoint** returns DR=CR balance for each bloc.
   Use this to verify after any modification to the accounting engine.

6. **The bcrypt fix**: `requirements.txt` must have `passlib==1.7.4` and `bcrypt==4.0.1`
   as separate packages (NOT `passlib[bcrypt]`). This avoids the 72-byte password error.

7. **The 14 tiers** must match EXACTLY: 10%, 50%, 70%, 90%, 100%, 120%, 150%, 200%, 250%, 300%, 500%, 800%, 1000%, 10000%.
   These are defined in `TIER_PERCENTAGES` in `products.py`.

8. **Maturity comparison**: `original_reservation_rate <= dsc_ruling_rate` (NOT current_reservation_rate).
   The original reservation rate = `tier_pct x H_at_reservation_time`.

9. **DME commission formula differs** based on B15:
   - B15 = 0 (DSP mode): `S/Q x P x 10%` (proportional to DSPs)
   - B15 = 1 (Fiat mode): `S x 10%` (raw percentage of markup)

10. **Members' commissions** in CLOSURE (B8) use `S/Q x P x 60%`, NOT 30%.
    The 60% is the combined endorsement (30%) + purchase (30%) commissions.
    In COMPLETION (B11), these are split into two separate 30% entries.

11. **Journal regeneration**: When conditions change, ALL journal entries for the preorder are
    deleted and regenerated from scratch. This is the `_recompute_journal()` function.

12. **Global min order**: Always `supplier_min_order x 1.20` (120%). Hardcoded in product creation.

---

## 18. Known Issues and Solutions

| Problem | Cause | Solution |
|---------|-------|---------|
| `ValueError: password cannot be longer than 72 bytes` | bcrypt version too recent | Use `bcrypt==4.0.1` in requirements.txt |
| CORS blocked | Backend crashes before responding | Fix the backend error first, CORS config is permissive (allow all) |
| `#N/A` in Crystallization sheet | Unresolved Excel formula reference | Non-blocking for the prototype |
| Floating point errors in journal | Using Python `float` instead of `Decimal` | Always use `Decimal(str(value))` pattern |
| Preorder creation fails with insufficient DSP | User DSP balance not topped up | Use `/admin/topup` to add DSPs first |
| Tiers show wrong values after DSC rate change | Old reservation options not deleted | The `update_dsc_rate` endpoint handles this correctly |

---

## 19. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://dsm:dsm_secret@localhost:5432/dsm_db` | PostgreSQL connection string |
| `SECRET_KEY` | `dsm_secret_key` | JWT signing key (change in production) |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token expiry (24 hours) |
| `NEXT_PUBLIC_API_URL` | `/api` | Frontend API base URL |
| `BACKEND_INTERNAL_URL` | `http://backend:8000` | Internal backend URL for Next.js proxy |

---

## 20. UI Display of Sheet Descriptions

The exact wording from the "DSM Scripting Ferdinand" sheet is rendered in three places
in the frontend (`frontend/src/pages/preorders/[id].tsx`):

1. **`EVENT_DESCRIPTIONS`** -- subtitle under each journal bloc header (Origination,
   Cancellation, Closure, Supplier Failed, Prepayment, Completion, Prepaid Completion,
   DSM Failed). Source: the bloc titles in the "As Transactions" sheet.

2. **`CONDITION_DESCRIPTIONS`** -- subtitle inside each `ConditionSwitch` button in the
   admin panel (B7-B13). Source: the "Deal conditions" / "Enterpretation" rows.

3. **Conditions table (B7-B15)** -- the "Trigger" column now displays the full exact
   sheet wording (e.g. *"When the reserved DSPs are sold to close the deal or when the
   supplier's deal that is fully payable by DSPs becomes crystallized"*) instead of a
   short summary.

If the sheet wording changes, update these three dictionaries at the top of
`frontend/src/pages/preorders/[id].tsx`.

---

## 21. Deployment -- Cloudflare Named Tunnel (permanent URL)

**Public URL:** https://dsm.httplovelyzouhoue.com
**Tunnel name:** `dsm-tunnel`
**Tunnel UUID:** `6047c8c7-3d3b-47d2-8aa8-e51696258efd`
**Config file:** `C:\Users\godso\.cloudflared\config.yml`
**Credentials file:** `C:\Users\godso\.cloudflared\6047c8c7-3d3b-47d2-8aa8-e51696258efd.json` (KEEP SECRET)

### Architecture

```
Internet -> Cloudflare edge -> Named Tunnel (cloudflared on this PC)
        -> http://localhost:3000 (Next.js frontend container)
        -> /api/[...path].ts proxy -> http://backend:8000 (Docker network)
```

The Next.js API proxy is what makes the FastAPI backend reachable through the tunnel
without exposing port 8000 publicly.

### Auto-start at boot (configured)

The whole stack is configured to auto-start when the PC boots — **no manual action required**:

1. **Docker Desktop** -- auto-start enabled (Windows startup entry)
2. **Containers** -- `restart: unless-stopped` policy in `docker-compose.yml`
   (postgres, backend, frontend all restart with Docker)
3. **Cloudflared** -- installed as Windows service `Cloudflared` with `StartType: Automatic`
   - Service binary path (registry `HKLM\SYSTEM\CurrentControlSet\Services\Cloudflared\ImagePath`):
     ```
     "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --config "C:\Users\godso\.cloudflared\config.yml" run dsm-tunnel
     ```

Unlike Quick Tunnels, the URL never changes and there is no Error 1033 expiration.

### Manual control (if needed)

```powershell
# Status
Get-Service Cloudflared

# Stop / Start / Restart (requires admin)
Stop-Service Cloudflared
Start-Service Cloudflared
Restart-Service Cloudflared
```

### `~/.cloudflared/config.yml` structure

```yaml
tunnel: 6047c8c7-3d3b-47d2-8aa8-e51696258efd
credentials-file: C:\Users\godso\.cloudflared\6047c8c7-3d3b-47d2-8aa8-e51696258efd.json

ingress:
  - hostname: dsm.httplovelyzouhoue.com
    service: http://localhost:3000
  - service: http_status:404
```

### One-time setup (already done, for reference)

```powershell
# 1. Login (opens browser, choose zone, click Authorize)
cloudflared tunnel login

# 2. Create the tunnel (writes credentials JSON to ~/.cloudflared/<UUID>.json)
cloudflared tunnel create dsm-tunnel

# 3. Create DNS CNAME (in Cloudflare DNS)
cloudflared tunnel route dns dsm-tunnel dsm.httplovelyzouhoue.com

# 4. Write ~/.cloudflared/config.yml (see structure above)

# 5. Install Windows service (run as Administrator)
cloudflared service install

# 6. Fix service ImagePath (default install ignores config.yml location)
#    Run as Administrator:
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Cloudflared"
$imagePath = '"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --config "C:\Users\godso\.cloudflared\config.yml" run dsm-tunnel'
Set-ItemProperty -Path $regPath -Name "ImagePath" -Value $imagePath
Restart-Service Cloudflared
```

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| HTTP 502 / 503 via tunnel | Service has wrong ImagePath (just `cloudflared.exe` with no args) | Re-apply the Set-ItemProperty fix above, then `Restart-Service Cloudflared` |
| Service crashes (exit 1067) | Tunnel name or config.yml path wrong in ImagePath | Verify with `sc.exe qc Cloudflared` |
| "Registry key already exists" during `service install` | Old uninstall left registry orphan | `Remove-Item HKLM:\SYSTEM\CurrentControlSet\Services\EventLog\Application\Cloudflared -Recurse` then reinstall |
| Tunnel works locally but not in browser | DNS CNAME missing | `cloudflared tunnel route dns dsm-tunnel dsm.httplovelyzouhoue.com` |

---

## 22. End-to-End Verification Results (2026-05-16)

Full behavioural verification was performed against the "DSM Scripting Ferdinand"
sheet using preorder id=11 (1 unit, tier 90%, Vostro 7620, H=$50,000, B14=0.10, B15=1).

### Test fixture values (computed by the engine, match sheet exactly)

| Variable | Expected | Actual |
|----------|----------|--------|
| O (Reserved DSPs) | 0.040000 | 0.04000000 |
| P (Requisite DSPs) | 0.036000 | 0.03600000 |
| T (Excess) | 0.004000 | 0.00400000 |
| U (Deficiency) | 0 | 0 |
| Q (Deal value) | $1,800 | 1800.00 |
| R (Supplier value) | $1,500 | 1500.00 |
| S (Markup) | $300 | 300.00 |
| Maturity | Mature | Mature |

### Scenarios tested (all matched sheet formulas)

| # | Conditions toggled | Bloc(s) generated | Deal status | Result |
|---|--------------------|-------------------|-------------|--------|
| A | B7=1 | CANCELLATION (2) | Cancelled | OK |
| B | B8=1 | CLOSURE (8 lines + excess refund T=0.004) | Closed | OK |
| C | B8+B11=1 | COMPLETION (14 lines, markup 30/30/20/10/10) | Completed | OK |
| D | B8+B10+B12=1 | PREPAYMENT (8) + PREPAID_COMPLETION (13) | Completed | OK |
| E | B13=1 | DSM_FAILED (4 lines) | DSMFailed | OK |
| F | B8=1, B14=0.50 | CLOSURE with split modified (750 fiat + 0.015 DSP) | Closed | OK |
| G | B8=1, B15=false | CLOSURE with DME in DSP (0.0006) instead of $30 fiat | Closed | OK |

### Key numerical proofs (1-unit Vostro, B14=10%, B15=Fiat)

| Formula | Expected | Verified output |
|---------|----------|-----------------|
| Supplier fiat = R x (1 - B14) | $1,350 | 1350.00 |
| Supplier DSP = R/Q x P x B14 | 0.003 | 0.00300000 |
| DSM margin = S/Q x P x 30% | 0.0018 | 0.00180000 |
| DME Fiat (B15=1) = S x 10% | $30 | 30.00 |
| DME DSP (B15=0) = S/Q x P x 10% | 0.0006 | 0.00060000 |
| Members (closure) = S/Q x P x 60% | 0.0036 | 0.00360000 |
| Recommendation Commission (completion) = S/Q x P x 20% | 0.0012 | 0.00120000 |
| Purchase commissions (code 2130) (completion) = S/Q x P x 30% | 0.0018 | 0.00180000 |
| Leader Pool Monthly Payable (code 2160) (completion) = S/Q x P x 10% | 0.0006 | 0.00060000 |
| Excess refund (T when B8 & T>0) | 0.004 | 0.00400000 |

### DR = CR balance (per bloc, all entries)

All 9 blocs balanced with max DSP-equivalent residual of `1E-30` (well below the
0.01 tolerance threshold). The `/preorders/{id}/validate` endpoint returns
`balanced: true` for every bloc.

### How to re-run this verification

```powershell
# 1. Get an admin JWT (replace credentials as needed)
$body = '{"email":"verif@dsm-check.com","password":"Verif123!"}'
$r = Invoke-RestMethod -Method Post "http://localhost:8000/auth/login" `
     -ContentType "application/json" -Body $body
$tok = $r.access_token
$h = @{ "Authorization" = "Bearer $tok" }

# 2. Toggle conditions on preorder #11 (or any 1-unit Vostro tier 90% preorder)
$payload = '{"b8_deal_closed":true,"b9_supplier_failed":true,"b14_supplier_dsp_pct":0.10,"b15_dme_fiat":true}'
$po = Invoke-RestMethod -Method Put "http://localhost:8000/preorders/11/conditions" `
      -Headers $h -ContentType "application/json" -Body $payload

# 3. Inspect journal entries for a specific bloc
$po.journal_entries | Where-Object { $_.event_type -eq "SUPPLIER_FAILED" } |
  Format-Table account_name, debit, credit, currency

# 4. Validate DR=CR balance for all 9 blocs
Invoke-RestMethod "http://localhost:8000/preorders/11/validate" -Headers $h
```

### Known minor issue spotted during verification

`GET /products/{id}` returns `options: []` because the SQLAlchemy relation
is not eagerly loaded in `ProductOut`. The data IS in the DB (verified via
direct psql query — all 14 tiers present and matching sheet 1(b)). The
frontend product page fetches options separately so this is non-blocking.
Fix: add `lazy="joined"` on `Product.options` or use `selectinload` in the
products router.

---

## 23. Quick Reference -- Formula Cheat Sheet

```
Reservation Rate    = tier_pct x H
DSPs per unit       = deal_price / reservation_rate
O (Reserved DSPs)   = units x dsps_per_unit_at_reservation
P (Requisite DSPs)  = units x (deal_price / H_current)
Q (Deals value)     = units x deal_price
R (Suppliers value) = units x supplier_price
S (Markup)          = Q - R
T (Excess)          = max(O - P, 0)
U (Deficiency)      = max(P - O, 0)

Supplier fiat part  = R x (1 - B14)
Supplier DSP part   = R/Q x P x B14
DSM margin          = S/Q x P x 30%
DME (DSP mode)      = S/Q x P x 10%
DME (Fiat mode)     = S x 10%
Members commissions = S/Q x P x 60%

Mature    = (original_reservation_rate <= dsc_ruling_rate)
Immature  = (original_reservation_rate > dsc_ruling_rate)

Crystallized = SUM(units of Mature+Waiting preorders) >= global_min_order
global_min_order = supplier_min_order x 1.20
```

---

## 24. Database Schema (SQLAlchemy Models)

File: `backend/app/models.py`. Engine: PostgreSQL 15. Decimal precision: `Numeric(24, 8)`.

### Table `users`
```python
class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String, unique=True, index=True, nullable=False)
    full_name       = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin        = Column(Boolean, default=False)
    dsp_balance     = Column(Numeric(24, 8), default=0)
    usd_balance     = Column(Numeric(24, 8), default=0)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    preorders       = relationship("Preorder", back_populates="user")
```

### Table `products`
```python
class Product(Base):
    __tablename__ = "products"
    id                  = Column(Integer, primary_key=True, index=True)
    name                = Column(String, nullable=False)
    description         = Column(String)
    image_url           = Column(String)
    supplier_price      = Column(Numeric(24, 8), nullable=False)   # wholesale
    deal_price          = Column(Numeric(24, 8), nullable=False)   # retail + markup
    supplier_min_order  = Column(Integer, nullable=False)
    global_min_order    = Column(Integer, nullable=False)          # = supplier_min_order * 1.20
    personal_min_order  = Column(Integer, default=1)
    dsc_ruling_rate     = Column(Numeric(24, 8), nullable=False)   # current DSC/USD rate (H)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    reservation_options = relationship("ReservationOption", back_populates="product",
                                       cascade="all, delete-orphan")
    preorders           = relationship("Preorder", back_populates="product")
```

### Table `reservation_options` (Table 1a tiers)
```python
class ReservationOption(Base):
    __tablename__ = "reservation_options"
    id               = Column(Integer, primary_key=True, index=True)
    product_id       = Column(Integer, ForeignKey("products.id"), nullable=False)
    tier_pct         = Column(Numeric(10, 4), nullable=False)   # 0.10, 0.50, ..., 100
    reservation_rate = Column(Numeric(24, 8), nullable=False)   # tier_pct * dsc_ruling_rate
    dsps_per_unit    = Column(Numeric(24, 8), nullable=False)   # deal_price / reservation_rate
    usd_equivalent   = Column(Numeric(24, 8), nullable=False)   # dsc_ruling_rate * dsps_per_unit
    product          = relationship("Product", back_populates="reservation_options")
```

### Table `preorders`
```python
class Preorder(Base):
    __tablename__ = "preorders"
    id          = Column(Integer, primary_key=True, index=True)
    unique_id   = Column(BigInteger, unique=True, nullable=False)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id  = Column(Integer, ForeignKey("products.id"), nullable=False)
    option_id   = Column(Integer, ForeignKey("reservation_options.id"), nullable=False)

    # ── Fixed at reservation
    reservation_time          = Column(DateTime(timezone=True), server_default=func.now())
    tier_pct                  = Column(Numeric(10, 4), nullable=False)
    original_reservation_rate = Column(Numeric(24, 8), nullable=False)
    supplier_price            = Column(Numeric(24, 8), nullable=False)
    deal_price                = Column(Numeric(24, 8), nullable=False)
    reserved_units            = Column(Integer, nullable=False)
    reserved_dsps_per_unit    = Column(Numeric(24, 8), nullable=False)
    min_order                 = Column(Integer, nullable=False)
    reserved_dsps             = Column(Numeric(24, 8), nullable=False)   # O
    deals_value               = Column(Numeric(24, 8), nullable=False)   # Q
    suppliers_value           = Column(Numeric(24, 8), nullable=False)   # R
    deals_markup              = Column(Numeric(24, 8), nullable=False)   # S = Q - R

    # ── Recomputed on DSC rate update
    current_reservation_rate  = Column(Numeric(24, 8), nullable=False)
    dsc_ruling_rate           = Column(Numeric(24, 8), nullable=False)   # H
    dsps_needed_per_unit      = Column(Numeric(24, 8), nullable=False)
    requisite_dsps            = Column(Numeric(24, 8), nullable=False)   # P
    excess_dsps               = Column(Numeric(24, 8), nullable=False)   # T = max(O-P, 0)
    deficiency_dsps           = Column(Numeric(24, 8), nullable=False, default=0)  # U = max(P-O, 0)

    # ── Conditions B7-B13
    b7_cancelled          = Column(Boolean, default=False)
    b8_deal_closed        = Column(Boolean, default=False)
    b9_supplier_failed    = Column(Boolean, default=False)
    b10_prepaid           = Column(Boolean, default=False)
    b11_confirmed         = Column(Boolean, default=False)
    b12_prepaid_confirmed = Column(Boolean, default=False)
    b13_dsm_failed        = Column(Boolean, default=False)

    # ── Config B14-B15
    b14_supplier_dsp_pct  = Column(Numeric(5, 4), default=0.10)
    b15_dme_fiat          = Column(Boolean, default=True)

    # ── Status
    maturity_status        = Column(String, default="Mature")
    crystallization_status = Column(String, default="NonCrystallized")
    deal_status            = Column(String, default="Waiting")

    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user             = relationship("User", back_populates="preorders")
    product          = relationship("Product", back_populates="preorders")
    option           = relationship("ReservationOption")
    journal_entries  = relationship("JournalEntry", back_populates="preorder",
                                    cascade="all, delete-orphan")
```

### Table `journal_entries`
```python
class JournalEntry(Base):
    __tablename__ = "journal_entries"
    id             = Column(Integer, primary_key=True, index=True)
    preorder_id    = Column(Integer, ForeignKey("preorders.id"), nullable=False)
    event_type     = Column(String, nullable=False)
    # event_type values:
    # ORIGINATION | BUY_DSPS | CANCELLATION | CLOSURE |
    # SUPPLIER_FAILED | PREPAYMENT | COMPLETION | PREPAID_COMPLETION | DSM_FAILED
    account_name   = Column(String, nullable=False)
    debit          = Column(Numeric(24, 8), default=0)
    credit         = Column(Numeric(24, 8), default=0)
    account_type   = Column(String)   # "Current asset" | "Current liability" | "Revenue" | "Expense" | ...
    currency       = Column(String)   # "DSP" | "USD"
    dsp_equivalent = Column(Numeric(24, 8), default=0)   # signed (+ debit, − credit)
    note           = Column(String)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    preorder       = relationship("Preorder", back_populates="journal_entries")
```

### Database init (`backend/app/database.py`)
```python
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://dsm:dsm_secret@localhost:5432/dsm_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase): pass

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()
```

### App bootstrap (`backend/app/main.py`)
```python
Base.metadata.create_all(bind=engine)   # creates new tables only (NOT new columns)

app = FastAPI(title="DSM — Digital Shopping Mall", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(preorders.router)
app.include_router(admin.router)
```

---

## 25. Pydantic Schemas (Request/Response)

File: `backend/app/schemas.py`. Pydantic v2 (`model_config = {"from_attributes": True}`).

### Auth
```python
class UserCreate(BaseModel):
    email: EmailStr        # NOTE: rejects .test TLD (use .com, .io, etc.)
    full_name: str
    password: str
    is_admin: bool = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int; email: str; full_name: str; is_admin: bool
    dsp_balance: Decimal; usd_balance: Decimal; created_at: datetime
    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str         # always "bearer"
    user: UserOut
```

### Products
```python
class ReservationOptionOut(BaseModel):
    id: int; tier_pct: Decimal; reservation_rate: Decimal
    dsps_per_unit: Decimal; usd_equivalent: Decimal
    model_config = {"from_attributes": True}

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    supplier_price: Decimal
    deal_price: Decimal
    supplier_min_order: int
    dsc_ruling_rate: Decimal

class ProductOut(BaseModel):
    id: int; name: str; description: Optional[str]; image_url: Optional[str]
    supplier_price: Decimal; deal_price: Decimal
    supplier_min_order: int; global_min_order: int; personal_min_order: int
    dsc_ruling_rate: Decimal; is_active: bool
    reservation_options: List[ReservationOptionOut] = []
    created_at: datetime
    model_config = {"from_attributes": True}
```

### Preorders
```python
class PreorderCreate(BaseModel):
    product_id: int                                    # required
    option_id: int                                     # required (common pitfall: BOTH needed)
    reserved_units: int
    b14_supplier_dsp_pct: Decimal = Decimal("0.10")
    b15_dme_fiat: bool = True

class ConditionUpdate(BaseModel):
    b7_cancelled:          Optional[bool]    = None
    b8_deal_closed:        Optional[bool]    = None
    b9_supplier_failed:    Optional[bool]    = None
    b10_prepaid:           Optional[bool]    = None
    b11_confirmed:         Optional[bool]    = None
    b12_prepaid_confirmed: Optional[bool]    = None
    b13_dsm_failed:        Optional[bool]    = None
    b14_supplier_dsp_pct:  Optional[Decimal] = None
    b15_dme_fiat:          Optional[bool]    = None
    new_dsc_rate:          Optional[Decimal] = None    # updates the DSC rate

class JournalEntryOut(BaseModel):
    id: int; event_type: str; account_name: str
    debit: Decimal; credit: Decimal
    account_type: Optional[str]; currency: Optional[str]
    dsp_equivalent: Decimal; note: Optional[str]; created_at: datetime
    model_config = {"from_attributes": True}

class PreorderOut(BaseModel):
    # Mirror of the Preorder model + journal_entries: List[JournalEntryOut]
    # All fields from the model are exposed
    ...
```

### Admin
```python
class TopUpRequest(BaseModel):
    user_id: int
    dsp_amount: Optional[Decimal] = None
    usd_amount: Optional[Decimal] = None

class DscRateUpdate(BaseModel):
    product_id: int
    new_rate: Decimal

class ValidationResult(BaseModel):
    event: str
    total_dsp_equivalent: float
    balanced: bool
    entry_count: int
```

---

## 26. Authentication Flow

### Backend (`backend/app/auth.py`)

```python
SECRET_KEY = os.getenv("SECRET_KEY", "dsm_secret_key")
ALGORITHM  = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24h

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    creds_exc = HTTPException(401, "Token invalide ou expiré",
                              headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None: raise creds_exc
    except JWTError:
        raise creds_exc
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None: raise creds_exc
    return user

def require_admin(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(403, "Accès réservé à l'administrateur")
    return current_user
```

**JWT payload structure:** `{"sub": str(user.id), "exp": <utc datetime>}`. `sub` is the user id as a string.

**bcrypt pin:** Requirements MUST use `passlib==1.7.4` + `bcrypt==4.0.1` separately
(not `passlib[bcrypt]`). Newer bcrypt versions raise "password cannot be longer than 72 bytes".

### Frontend (`frontend/src/lib/api.ts`)

```typescript
import axios from "axios"
import { create } from "zustand"
import { persist } from "zustand/middleware"

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api"

export function apiError(e: any): string {
  const detail = e.response?.data?.detail
  if (!detail) return "Error"
  if (typeof detail === "string") return detail
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join(", ")
  return "Error"
}

export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("dsm_token")
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

interface User { id: number; email: string; full_name: string; is_admin: boolean
                 dsp_balance: string; usd_balance: string }
interface AuthState {
  user: User | null; token: string | null
  _hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, full_name: string, password: string, is_admin?: boolean) => Promise<void>
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null, token: null, _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      login: async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password })
        localStorage.setItem("dsm_token", data.access_token)
        set({ user: data.user, token: data.access_token })
      },
      register: async (email, full_name, password, is_admin = false) => {
        await api.post("/auth/register", { email, full_name, password, is_admin })
      },
      logout: () => {
        localStorage.removeItem("dsm_token")
        set({ user: null, token: null })
      },
    }),
    {
      name: "dsm-auth",
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => { state?.setHasHydrated(true) },
    }
  )
)
```

**Critical pattern:** every page that needs auth must check `_hasHydrated` BEFORE redirecting:
```tsx
useEffect(() => {
  if (!_hasHydrated) return
  if (!user) { router.push("/login"); return }
  load()
}, [_hasHydrated, user])
```
Without this, hard refreshes always bounce to /login.

---

## 27. Docker Setup

### `docker-compose.yml`
```yaml
version: "3.9"

services:
  postgres:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_USER: dsm
      POSTGRES_PASSWORD: dsm_secret
      POSTGRES_DB: dsm_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dsm -d dsm_db"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build: ./backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://dsm:dsm_secret@postgres:5432/dsm_db
      SECRET_KEY: dsm_jwt_secret_key_change_in_production
      ALGORITHM: HS256
      ACCESS_TOKEN_EXPIRE_MINUTES: "1440"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: /api
      BACKEND_INTERNAL_URL: http://backend:8000
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next

volumes:
  postgres_data:
```

### `backend/Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### `frontend/Dockerfile`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
```

### `backend/requirements.txt` (exact versions — bcrypt pin is critical)
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
psycopg2-binary==2.9.9
alembic==1.13.1
python-jose[cryptography]==3.3.0
passlib==1.7.4
bcrypt==4.0.1
python-multipart==0.0.9
pydantic==2.7.1
pydantic-settings==2.2.1
python-dotenv==1.0.1
```

### `frontend/package.json`
```json
{
  "name": "dsm-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "^18",
    "react-dom": "^18",
    "axios": "^1.7.2",
    "zustand": "^4.5.2",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.383.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tooltip": "^1.0.7",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3.4.4",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38"
  }
}
```

---

## 28. Next.js Configuration

### `frontend/next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { domains: ["images.unsplash.com"] },
}
module.exports = nextConfig
```

### `frontend/src/pages/api/[...path].ts` -- Critical proxy for Cloudflare Tunnel

This proxy is what makes the FastAPI backend reachable through the tunnel
(which only exposes port 3000). Without it, the API is unreachable from
the public Cloudflare URL.

```typescript
import type { NextApiRequest, NextApiResponse } from "next"
import http from "http"

const BACKEND = process.env.BACKEND_INTERNAL_URL || "http://localhost:8000"

export const config = { api: { bodyParser: true, externalResolver: true } }

function proxyRequest(
  method: string, targetUrl: string,
  headers: Record<string, string>, body: string | undefined,
  res: NextApiResponse, resolve: () => void, depth = 0
) {
  if (depth > 5) { res.status(502).json({ detail: "Too many redirects" }); return resolve() }

  const parsed = new URL(targetUrl)
  const proxyReq = http.request(
    { hostname: parsed.hostname, port: parsed.port,
      path: parsed.pathname + parsed.search, method, headers },
    (proxyRes) => {
      // Follow redirects server-side (FastAPI returns 307 for trailing-slash fixes)
      if (proxyRes.statusCode && [301, 302, 307, 308].includes(proxyRes.statusCode)
          && proxyRes.headers.location) {
        const redirectUrl = new URL(proxyRes.headers.location, targetUrl).toString()
        const newMethod = [307, 308].includes(proxyRes.statusCode) ? method : "GET"
        const newBody   = [307, 308].includes(proxyRes.statusCode) ? body : undefined
        proxyRequest(newMethod, redirectUrl, headers, newBody, res, resolve, depth + 1)
        return
      }
      res.status(proxyRes.statusCode || 500)
      const ct = proxyRes.headers["content-type"]
      if (ct) res.setHeader("content-type", ct)
      const chunks: Buffer[] = []
      proxyRes.on("data", (chunk) => chunks.push(chunk))
      proxyRes.on("end", () => { res.send(Buffer.concat(chunks)); resolve() })
    }
  )
  proxyReq.on("error", (err) => {
    res.status(502).json({ detail: `Proxy error: ${err.message}` })
    resolve()
  })
  if (body) proxyReq.write(body)
  proxyReq.end()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pathSegments = req.query.path as string[]
  const backendPath = "/" + pathSegments.join("/")
  const targetUrl = BACKEND + backendPath

  const body = req.method !== "GET" && req.method !== "HEAD" && req.body
    ? JSON.stringify(req.body) : undefined

  const headers: Record<string, string> = { "content-type": "application/json" }
  if (req.headers.authorization) headers["authorization"] = req.headers.authorization as string

  return new Promise<void>((resolve) => {
    proxyRequest(req.method || "GET", targetUrl, headers, body, res, resolve)
  })
}
```

---

## 29. Tailwind Theme & CSS Utility Classes

### `frontend/tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          50:"#fffbeb", 100:"#fef3c7", 200:"#fde68a", 300:"#fcd34d",
          400:"#fbbf24", 500:"#f59e0b", 600:"#d97706", 700:"#b45309",
          800:"#92400e", 900:"#78350f",
        },
        onyx: {
          50:"#f8f8f8", 100:"#f0f0f0", 200:"#e0e0e0", 300:"#c0c0c0",
          400:"#888888", 500:"#555555", 600:"#333333", 700:"#222222",
          800:"#161616", 900:"#0a0a0a", 950:"#050505",
        }
      },
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],
        body:    ["'DM Sans'", "system-ui", "sans-serif"],
        mono:    ["'DM Mono'", "monospace"],
      },
      animation: {
        "fade-in":    "fadeIn 0.4s ease-out",
        "slide-up":   "slideUp 0.4s ease-out",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: "translateY(16px)" },
                     to:   { opacity: 1, transform: "translateY(0)" } },
        pulseGold: { "0%,100%": { boxShadow: "0 0 0 0 rgba(251,191,36,0.3)" },
                     "50%":     { boxShadow: "0 0 0 8px rgba(251,191,36,0)" } },
      }
    }
  },
  plugins: []
}
```

### Reusable CSS classes (`frontend/src/styles/globals.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
@tailwind base; @tailwind components; @tailwind utilities;

@layer base {
  body { @apply bg-onyx-950 text-onyx-100 font-body; }
}

@layer components {
  .btn-gold { @apply px-5 py-2.5 bg-gold-500 text-onyx-950 font-semibold rounded-lg
                     hover:bg-gold-400 transition-all text-sm
                     disabled:opacity-40 disabled:cursor-not-allowed; }
  .btn-outline { @apply px-5 py-2.5 border border-onyx-600 text-onyx-200 font-medium rounded-lg
                        hover:border-gold-500 hover:text-gold-400 transition-all text-sm; }
  .card { @apply bg-onyx-900 border border-onyx-800 rounded-xl p-5; }
  .badge { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium; }
  .input { @apply w-full bg-onyx-800 border border-onyx-700 rounded-lg px-3 py-2.5 text-sm
                  text-onyx-100 placeholder-onyx-500
                  focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30; }
  .label { @apply block text-xs font-mono text-onyx-400 mb-1.5 uppercase tracking-wider; }
  .section-title { @apply font-display text-2xl font-semibold text-white; }
  .table-row { @apply border-b border-onyx-800 hover:bg-onyx-800/50 transition-colors; }
}
```

A complete light-mode override is also present in `globals.css` using
`html:not(.dark)` selectors (~60 lines) — copy it verbatim from the repo.

---

## 30. Frontend Pages & Components

Files under `frontend/src/pages/`:

| File | Purpose | API calls |
|------|---------|-----------|
| `_app.tsx` | Next.js wrapper, mounts toast container | — |
| `index.tsx` | Store/catalog: product list, tier table per product, pre-order form | `GET /products/`, `POST /preorders/` |
| `login.tsx` | Login form using `useAuth.login()` | `POST /auth/login` |
| `register.tsx` | Registration form | `POST /auth/register` |
| `dashboard.tsx` | Current user's pre-orders list | `GET /preorders/` |
| `preorders/[id].tsx` | Pre-order detail: variables (O,P,Q,R,S,T,U), markup distribution, B7-B15 conditions, journal blocs, admin controls | `GET /preorders/{id}`, `PUT /preorders/{id}/conditions` |
| `admin/index.tsx` | Admin dashboard: users + products tables with delete buttons | `GET /admin/users`, `GET /products/`, `DELETE /admin/users/{id}`, `DELETE /admin/products/{id}`, `POST /admin/topup`, `POST /admin/seed` |
| `admin/users.tsx` | User listing (alternative view) with delete | `GET /admin/users`, `DELETE /admin/users/{id}` |
| `api/[...path].ts` | HTTP proxy (see section 28) | — |

Components under `frontend/src/components/`:
- `Layout.tsx`: navbar (logo + nav links + dark-mode toggle + user menu), footer, wraps page content in `<main className="container mx-auto px-4 py-6">`

State management:
- **Zustand `useAuth`** persisted in localStorage under key `dsm-auth` (see section 26)
- No other global store — per-page `useState` for everything else

---

## 31. Database Migrations / Schema Evolution

This project has **no Alembic** despite the package being installed. Schema is created
by `Base.metadata.create_all(bind=engine)` in `main.py` on every backend startup.

**Critical behaviour:** `create_all` only creates **new tables** that don't exist.
It does NOT add new columns to existing tables. Adding columns requires manual SQL.

### Procedure to add a new column

1. Edit `models.py` -- add the column to the SQLAlchemy class with sensible default
2. Run the ALTER TABLE manually against the running PostgreSQL container
3. Backfill if needed
4. Restart the backend so SQLAlchemy reloads metadata

### Example: how `deficiency_dsps` was added

```bash
# 1. backend/app/models.py: add line
#    deficiency_dsps = Column(Numeric(24, 8), nullable=False, default=0)

# 2. ALTER TABLE
docker exec dsm-system-postgres-1 psql -U dsm -d dsm_db -c \
  "ALTER TABLE preorders ADD COLUMN IF NOT EXISTS deficiency_dsps NUMERIC(24,8) NOT NULL DEFAULT 0;"

# 3. Backfill from existing data
docker exec dsm-system-postgres-1 psql -U dsm -d dsm_db -c \
  "UPDATE preorders SET deficiency_dsps = GREATEST(requisite_dsps - reserved_dsps, 0);"

# 4. Restart backend
docker-compose restart backend
```

If adopting Alembic later: `alembic init alembic`, configure `alembic.ini` with the
DATABASE_URL, autogenerate revisions from the `Base.metadata`.

---

## 32. API Payload Examples

Base URL (local): `http://localhost:8000`. Through Cloudflare tunnel: prefix `/api`.

### Register
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "admin@dsm-check.com",
  "full_name": "Admin User",
  "password": "Admin123!",
  "is_admin": true
}
```
**Common pitfall:** Pydantic `EmailStr` rejects `.test`, `.local`, and other reserved
TLDs. Use a public-looking TLD even for local testing (`.com`, `.io`, `.dev`).

Response (200):
```json
{
  "id": 9, "email": "admin@dsm-check.com", "full_name": "Admin User",
  "is_admin": true, "dsp_balance": "0E-8", "usd_balance": "0E-8",
  "created_at": "2026-05-16T15:15:28.696490Z"
}
```

### Login
```bash
POST /auth/login
Content-Type: application/json

{"email": "admin@dsm-check.com", "password": "Admin123!"}
```
Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": { /* UserOut */ }
}
```

### Get current user
```bash
GET /auth/me
Authorization: Bearer eyJ...
```

### List products
```bash
GET /products/
```
Returns `ProductOut[]`. **Known issue:** `reservation_options` may come back empty
in the array form; fetch a single product or query the DB if needed.

### Create preorder
```bash
POST /preorders/
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "product_id": 16,
  "option_id": 228,
  "reserved_units": 1
}
```
**Pitfall:** both `product_id` AND `option_id` are required (option_id identifies the tier).
Use `GET /products/{id}` then pick the right `reservation_options[].id`.

Response: full `PreorderOut` including O, P, Q, R, S, T, U, status, and the
generated `journal_entries` (ORIGINATION bloc).

### Toggle conditions / update rate
```bash
PUT /preorders/11/conditions
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "b8_deal_closed": true,
  "b9_supplier_failed": true,
  "b14_supplier_dsp_pct": 0.10,
  "b15_dme_fiat": true
}
```
Any subset of `b7_cancelled .. b15_dme_fiat` and/or `new_dsc_rate` can be sent.
The journal is fully regenerated. Response: full `PreorderOut` with new journal_entries.

### Validate balance
```bash
GET /preorders/11/validate
Authorization: Bearer eyJ...
```
Response:
```json
[
  {"event":"ORIGINATION","total_dsp_equivalent":0.0,"balanced":true,"entry_count":2},
  {"event":"CANCELLATION", "total_dsp_equivalent":0.0,"balanced":true,"entry_count":2},
  ...
]
```

### Seed (admin)
```bash
POST /admin/seed
Authorization: Bearer eyJ...
```
Creates the test buyer, 4 products (Vostro, MacBook, iPhone, Galaxy), and one
sample 20-unit preorder.

### Top up wallet (admin)
```bash
POST /admin/topup
Authorization: Bearer eyJ...
Content-Type: application/json

{"user_id": 8, "dsp_amount": 10, "usd_amount": null}
```

### Delete user/product (admin)
```bash
DELETE /admin/users/{user_id}
DELETE /admin/products/{product_id}
Authorization: Bearer eyJ...
```
Cascades to preorders / reservation_options.

---

## 33. Build & Run From Scratch (zero to running)

### Prerequisites
- Docker Desktop 4.x or Docker Engine 24+
- 4 GB free RAM, 2 GB disk
- Ports 3000, 5432, 8000 free on host
- Git (to clone)
- Optional: PowerShell 7 or Bash for the helper commands

### Step 1 -- Clone
```bash
git clone <repo-url> dsm-system
cd dsm-system
```

### Step 2 -- Build & start (first time ~3-5 minutes)
```bash
docker-compose up --build
# wait for: "frontend-1  | ✓ Ready in 3.4s"
```
On first run, the backend creates the schema via `create_all()`. Watch for
"Container dsm-system-postgres-1 Healthy" then "Started" on backend and frontend.

### Step 3 -- Visit the site
- Frontend: http://localhost:3000
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- API redoc: http://localhost:8000/redoc

### Step 4 -- Create the first admin user
The seed endpoint requires an admin, so you must register one first.

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dsm-mall.com","full_name":"Admin","password":"Admin123!","is_admin":true}'
```
(Or use the `/register` page in the UI but uncheck/check the "admin" box if exposed.)

### Step 5 -- Login & get JWT
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dsm-mall.com","password":"Admin123!"}' | jq -r .access_token)
```

### Step 6 -- Seed test data
```bash
curl -X POST http://localhost:8000/admin/seed \
  -H "Authorization: Bearer $TOKEN"
```
This creates the buyer (`buyer@dsm.test` -- yes this email works for SEED because
it bypasses Pydantic), 4 products, and a sample preorder.

### Step 7 -- Browse & verify
- Login as admin in the UI
- Open the store page -- you should see 4 products with their tier tables
- Open any preorder detail -- you should see O, P, Q, R, S, T, U displayed
- As admin, toggle B7-B13 conditions to watch the journal regenerate live

### Step 8 -- (optional) Add public access via Cloudflare Tunnel
See Section 21 (Cloudflare Named Tunnel) for the full procedure.

### Verification checklist
A correctly rebuilt system should pass:
- [ ] `docker ps` shows 3 containers Up (postgres, backend, frontend)
- [ ] `GET /health` returns `{"status":"healthy"}`
- [ ] Vostro at tier 90% / 1 unit gives O=0.04, P=0.036, T=0.004
- [ ] Toggling B8=true on that preorder produces 8 journal lines in CLOSURE bloc
       including Supplier fiat USD = 1350 and excess refund 0.004
- [ ] `GET /preorders/{id}/validate` returns `balanced: true` for all 9 blocs

If any of those fails, cross-reference sections 6-8 of this document for the
expected formulas.

