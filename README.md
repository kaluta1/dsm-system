# DSM — Digital Shopping Mall

## Pre-order marketplace prototype with automated accounting journal

A test implementation of a pre-order economic model derived from the
"DSM Scripting Ferdinand" specification — featuring a cryptocurrency-backed
voucher system (DSC / DSP), 14-tier reservation pricing, and a 9-block
double-entry accounting engine in `Decimal` precision.

---

## 🏗️ Tech Stack

- **Backend** : FastAPI + SQLAlchemy + PostgreSQL
- **Frontend** : Next.js 14 + TypeScript + Tailwind CSS
- **Infrastructure** : Docker Compose
- **Precision** : Python `Decimal` (8 decimals, < 0.001 % error margin)

---

## 🚀 Quick Start

### Prerequisites
- Docker + Docker Compose installed

### Launch
```bash
cd dsm-system
docker-compose up --build
```

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8000
- **API docs (Swagger)** : http://localhost:8000/docs

---

## 📋 Usage Walkthrough

### 1. Create an Admin account
- Go to http://localhost:3000/register
- Check "Administrator account"
- Example: `admin@dsm-test.com` / `password123`

> ⚠️ The `.test` TLD is rejected by Pydantic's EmailStr — use a real-looking domain.

### 2. Create a regular User account
- Same page, leave the Admin checkbox unchecked
- Example: `user@dsm-test.com` / `password123`

### 3. (Admin) Create a product
- Navigate to http://localhost:3000/admin → Products tab
- Create a product with sample values (from the source spreadsheet):
  - Name: `Vostro 7620 Dell laptop`
  - Supplier price: `1500`
  - Deal price: `1800`
  - Supplier min order: `1000` (system enforces a global min of 1.20 × this)
  - Initial DSC rate: `50000`

### 4. (Admin) Top up the user's DSP wallet
- Navigate to http://localhost:3000/admin → Users tab
- Pick the user → add `10` DSP (enough to test with 1 unit at tier 90 %)

### 5. (User) Place a pre-order
- Go to http://localhost:3000
- Choose a reservation tier in table 1(b)
- Configure B14 (supplier DSP %) and B15 (DME fiat/DSP)
- Confirm the pre-order

### 6. (Admin) Test the conditions
- Open http://localhost:3000/dashboard → click the pre-order
- In the right-hand admin panel:
  - Change the DSC rate → recalculates P, T, U, maturity, and the whole journal
  - Toggle B7 (cancellation) → generates the cancellation entries
  - Toggle B8 (closure) → generates the closure entries
  - …and so on for every condition

---

## 📊 Data Dictionary

| Variable | Description |
|----------|-------------|
| **O** | Total reserved DSPs (units × DSPs/unit) — *fixed at origination* |
| **P** | Requisite DSPs at the current DSC rate — *variable* |
| **Q** | Total deal value (`units × deal_price`) |
| **R** | Supplier value (`units × supplier_price`) |
| **S** | Markup (`Q − R`) |
| **T** | Excess DSPs (`max(O − P, 0)`) |
| **U** | Deficiency DSPs (`max(P − O, 0)`) |
| **H** | Current DSC ruling rate |
| **H₀** | Original reservation rate at origination |
| **H₁** | Current reservation rate (`tier_pct × H`) |

## 🔀 Conditions (B7–B15)

| Condition | Trigger |
|-----------|---------|
| **B7** | Preorderer cancels the deal |
| **B8** | DSPs sold / deal closed |
| **B9** | Supplier fails to deliver |
| **B10** | System prepays the supplier |
| **B11** | Preorderer confirms receipt |
| **B12** | Preorderer confirms receipt (prepaid case) |
| **B13** | DSM fails to arbitrate the dispute |
| **B14** | % of supplier payment made in DSPs (default 10 %) |
| **B15** | DME payment mode (0 = DSP, 1 = Fiat) |

## ✅ Accounting Blocs (9 total)

| Bloc | Event |
|------|-------|
| BUY_DSPS | A member converts fiat into DSPs |
| Origination | Reservation creation (always generated) |
| Cancellation | When B7 = 1 |
| Closure | When B8 = 1 (includes excess refund T) |
| Supplier Failed | When B9 = 1 |
| Prepayment | When B10 = 1 |
| Completion | When B11 = 1 |
| Prepaid Completion | When B10 = 1 AND B12 = 1 |
| DSM Failed | When B13 = 1 |

---

## 💰 Markup Distribution (S = Q − R)

| Recipient | % of S | Account code |
|-----------|--------|--------------|
| DSM revenue | 30 % | — |
| Recommendation Commission | 20 % | — (to be set, per-user) |
| Purchase commissions | 30 % | 2130 |
| Leader Pool Monthly Payable | 10 % | 2160 |
| DME commission (DSP if B15=0 / Fiat if B15=1) | 10 % | — |

Members' commissions = Recommendation + Purchase + Leader Pool = **60 %** of S/Q × P.

---

## 🎯 Accounting Precision

The accounting engine uses Python `Decimal` (never `float`) to eliminate IEEE 754
rounding errors. Precision: 8 decimals. Maximum error per bloc: `< 0.001 %`.

Each bloc can be validated via `GET /preorders/{id}/validate` which returns the
DR = CR balance per event type.

---

## 📡 Key API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Create user account |
| POST | `/auth/login` | None | Login, returns JWT |
| GET | `/products/` | None | List active products with tiers |
| POST | `/preorders/` | JWT | Create pre-order |
| GET | `/preorders/` | JWT | List my pre-orders |
| GET | `/preorders/{id}` | JWT | Pre-order detail + journal |
| PUT | `/preorders/{id}/conditions` | Admin | Toggle B7–B15, regenerate journal |
| DELETE | `/preorders/{id}` | JWT (owner/admin) | Delete + refund DSPs if eligible |
| GET | `/preorders/{id}/validate` | Admin | DR = CR balance check per bloc |
| POST | `/admin/seed` | Admin | Seed reference data |
| POST | `/admin/topup` | Admin | Credit DSP/USD to a user |

Full Swagger UI at `http://localhost:8000/docs`.

---

## 🌐 Deployment

Local development can be exposed publicly via a Cloudflare Named Tunnel.
See `docker-compose.yml` for restart policies and infrastructure.

---

## 📄 License

Proprietary — all rights reserved.
