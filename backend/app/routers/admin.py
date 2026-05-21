from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime
import random
from app.database import get_db
from app import models, schemas
from app.auth import require_admin, hash_password
from app.accounting import compute_entries, PreorderData
from app.routers.products import build_options

router = APIRouter(prefix="/admin", tags=["Admin"])

ZERO = Decimal("0")


def _make_journal(db: Session, po: models.Preorder):
    """Supprime et régénère le journal comptable complet pour une précommande."""
    for e in po.journal_entries:
        db.delete(e)
    db.flush()
    data = PreorderData(
        reserved_dsps=Decimal(str(po.reserved_dsps)),
        deals_value=Decimal(str(po.deals_value)),
        suppliers_value=Decimal(str(po.suppliers_value)),
        deals_markup=Decimal(str(po.deals_markup)),
        dsc_ruling_rate=Decimal(str(po.dsc_ruling_rate)),
        requisite_dsps=Decimal(str(po.requisite_dsps)),
        excess_dsps=Decimal(str(po.excess_dsps)),
        deficiency_dsps=Decimal(str(po.deficiency_dsps)),
        b7_cancelled=po.b7_cancelled,
        b8_deal_closed=po.b8_deal_closed,
        b9_supplier_failed=po.b9_supplier_failed,
        b10_prepaid=po.b10_prepaid,
        b11_confirmed=po.b11_confirmed,
        b12_prepaid_confirmed=po.b12_prepaid_confirmed,
        b13_dsm_failed=po.b13_dsm_failed,
        b14_supplier_dsp_pct=Decimal(str(po.b14_supplier_dsp_pct)),
        b15_dme_fiat=po.b15_dme_fiat,
    )
    for line in compute_entries(data):
        db.add(models.JournalEntry(
            preorder_id=po.id,
            event_type=line.event_type,
            account_name=line.account_name,
            debit=line.debit,
            credit=line.credit,
            account_type=line.account_type,
            currency=line.currency,
            dsp_equivalent=line.dsp_equivalent,
            note=line.note,
        ))

@router.get("/users", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return db.query(models.User).all()

@router.post("/topup", response_model=schemas.UserOut)
def top_up_wallet(data: schemas.TopUpRequest, db: Session = Depends(get_db),
                  admin=Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == data.user_id).first()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    if data.dsp_amount:
        user.dsp_balance = Decimal(str(user.dsp_balance)) + Decimal(str(data.dsp_amount))
    if data.usd_amount:
        user.usd_balance = Decimal(str(user.usd_balance)) + Decimal(str(data.usd_amount))
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Delete a user and all their preorders/journal entries."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == admin.id:
        raise HTTPException(400, "You cannot delete your own account")
    # Delete all preorders (cascade deletes journal entries)
    for po in user.preorders:
        db.delete(po)
    db.delete(user)
    db.commit()
    return {"status": "ok", "deleted_user_id": user_id}


@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Delete a product, its reservation options, and all related preorders."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    # Delete all preorders linked to this product (cascade deletes journal entries)
    preorders = db.query(models.Preorder).filter(models.Preorder.product_id == product_id).all()
    for po in preorders:
        db.delete(po)
    # Product cascade deletes reservation_options
    db.delete(product)
    db.commit()
    return {"status": "ok", "deleted_product_id": product_id, "deleted_preorders": len(preorders)}


@router.post("/seed")
def seed_test_data(db: Session = Depends(get_db), admin=Depends(require_admin)):
    """
    Initialise la base avec les données du sheet Excel 1(b) + Testing.
    Idempotent — ne recrée pas ce qui existe déjà.

    Produit de référence (1b) :
      - Vostro 7620 Dell laptop, DSC rate = $50 000
      - deal_price = $1 800, supplier_price = $1 500, min = 1 000 (global 1 200)

    Précommande de test (Testing sheet) :
      - Buyer A, 20 unités, tier 90%
      - O = 0.8 DSP, P = 0.72 DSP, Q = $36 000, R = $30 000, S = $6 000, T = 0.08 DSP
      - Conditions : B8 = 1 (clôture), B14 = 10 %, B15 = Fiat
    """
    result = {}

    # ── 1. Utilisateur de test (buyer) ──────────────────────────────────
    buyer_email = "buyer@dsm.test"
    buyer = db.query(models.User).filter(models.User.email == buyer_email).first()
    if not buyer:
        buyer = models.User(
            email=buyer_email,
            full_name="Test Buyer 1(b)",
            hashed_password=hash_password("buyer123"),
            is_admin=False,
            dsp_balance=Decimal("1.200000"),   # solde initial du sheet 1(b)
            usd_balance=Decimal("60000.00"),   # montant du BUY_DSPS dans le sheet
        )
        db.add(buyer)
        db.flush()
        result["buyer"] = "created (email=buyer@dsm.test / pw=buyer123)"
    else:
        result["buyer"] = "already exists"

    # ── 2. Produits ─────────────────────────────────────────────────────
    PRODUCTS_DEF = [
        dict(
            name="Vostro 7620 Dell laptop",
            description="Dell laptop — Excel 1(b) reference scenario",
            supplier_price=Decimal("1500.00"),
            deal_price=Decimal("1800.00"),
            supplier_min_order=1000,
            global_min_order=1200,
            dsc_ruling_rate=Decimal("50000.000000"),
        ),
        dict(
            name='MacBook Pro 14"',
            description="Apple M3 Pro — 18 GB RAM, 512 GB SSD",
            supplier_price=Decimal("1800.00"),
            deal_price=Decimal("2200.00"),
            supplier_min_order=500,
            global_min_order=600,
            dsc_ruling_rate=Decimal("50000.000000"),
        ),
        dict(
            name="iPhone 15 Pro Max",
            description="Apple A17 Pro — 256 GB, Titanium",
            supplier_price=Decimal("900.00"),
            deal_price=Decimal("1100.00"),
            supplier_min_order=2000,
            global_min_order=2400,
            dsc_ruling_rate=Decimal("50000.000000"),
        ),
        dict(
            name="Samsung Galaxy S24 Ultra",
            description="Snapdragon 8 Gen 3 — 512 GB, Titanium Black",
            supplier_price=Decimal("800.00"),
            deal_price=Decimal("990.00"),
            supplier_min_order=1500,
            global_min_order=1800,
            dsc_ruling_rate=Decimal("50000.000000"),
        ),
    ]

    products_created = []
    products_existing = []
    product = None  # will be the Vostro for the test preorder

    for pdef in PRODUCTS_DEF:
        existing_p = db.query(models.Product).filter(
            models.Product.name == pdef["name"]
        ).first()
        if not existing_p:
            p = models.Product(is_active=True, **pdef)
            db.add(p)
            db.flush()
            for opt in build_options(p):
                db.add(opt)
            db.flush()
            products_created.append(pdef["name"])
            if pdef["name"] == "Vostro 7620 Dell laptop":
                product = p
        else:
            products_existing.append(pdef["name"])
            if pdef["name"] == "Vostro 7620 Dell laptop":
                product = existing_p

    result["products_created"] = products_created if products_created else "none (all already exist)"
    result["products_existing"] = products_existing or []

    # Commit products before moving to preorder
    db.commit()

    # ── 3. Précommande de test ───────────────────────────────────────────
    existing = db.query(models.Preorder).filter(
        models.Preorder.user_id == buyer.id,
        models.Preorder.product_id == product.id,
    ).first()

    if not existing:
        option_90 = db.query(models.ReservationOption).filter(
            models.ReservationOption.product_id == product.id,
            models.ReservationOption.tier_pct == Decimal("0.90"),
        ).first()
        if not option_90:
            raise HTTPException(500, "Option 90% introuvable — vérifiez le produit")

        H           = Decimal("50000")
        tier_pct    = Decimal("0.90")
        deal_price  = Decimal("1800")
        supp_price  = Decimal("1500")
        units       = 20

        orig_rate        = tier_pct * H                         # 45 000
        dsps_per_unit    = deal_price / orig_rate               # 0.040000
        reserved_dsps    = dsps_per_unit * units                # O = 0.800000
        dsps_needed      = deal_price / H                       # 0.036000
        requisite_dsps   = dsps_needed * units                  # P = 0.720000
        excess_dsps      = max(reserved_dsps - requisite_dsps, ZERO)  # T = 0.080000
        deficiency_dsps  = max(requisite_dsps - reserved_dsps, ZERO)  # U = 0
        deals_value      = deal_price * units                   # Q = 36 000
        suppliers_value  = supp_price * units                   # R = 30 000
        deals_markup     = deals_value - suppliers_value        # S =  6 000

        if Decimal(str(buyer.dsp_balance)) < reserved_dsps:
            raise HTTPException(
                400,
                f"Solde DSP insuffisant : {buyer.dsp_balance} < {reserved_dsps}"
            )

        po = models.Preorder(
            unique_id=int(datetime.utcnow().timestamp() * 1000) + random.randint(0, 999),
            user_id=buyer.id,
            product_id=product.id,
            option_id=option_90.id,
            tier_pct=tier_pct,
            original_reservation_rate=orig_rate,
            supplier_price=supp_price,
            deal_price=deal_price,
            reserved_units=units,
            reserved_dsps_per_unit=dsps_per_unit,
            min_order=product.global_min_order,
            reserved_dsps=reserved_dsps,
            deals_value=deals_value,
            suppliers_value=suppliers_value,
            deals_markup=deals_markup,
            current_reservation_rate=orig_rate,
            dsc_ruling_rate=H,
            dsps_needed_per_unit=dsps_needed,
            requisite_dsps=requisite_dsps,
            excess_dsps=excess_dsps,
            deficiency_dsps=deficiency_dsps,
            b14_supplier_dsp_pct=Decimal("0.10"),
            b15_dme_fiat=True,
            b8_deal_closed=True,        # B8 = 1 : clôture (Testing sheet)
            maturity_status="Mature",   # orig_rate (45000) <= H (50000)
            deal_status="Closed",
        )
        db.add(po)
        db.flush()

        buyer.dsp_balance = Decimal(str(buyer.dsp_balance)) - reserved_dsps
        _make_journal(db, po)
        db.commit()
        db.refresh(po)

        result["preorder"] = {
            "id": po.id,
            "unique_id": po.unique_id,
            "O_reserved_dsps": str(po.reserved_dsps),
            "P_requisite_dsps": str(po.requisite_dsps),
            "Q_deals_value": str(po.deals_value),
            "R_suppliers_value": str(po.suppliers_value),
            "S_markup": str(po.deals_markup),
            "T_excess": str(po.excess_dsps),
            "status": po.deal_status,
            "journal_entries": len(po.journal_entries),
        }
    else:
        result["preorder"] = f"already exists (id={existing.id})"

    return {"status": "ok", "seed": result}


@router.get("/crystallization/{product_id}")
def crystallization_status(product_id: int, db: Session = Depends(get_db),
                            admin=Depends(require_admin)):
    """Calcule l'état de cristallisation pour un produit"""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Produit introuvable")
    preorders = db.query(models.Preorder).filter(
        models.Preorder.product_id == product_id,
        models.Preorder.b7_cancelled == False,
    ).all()
    mature_waiting = [p for p in preorders if p.maturity_status == "Mature" and p.deal_status == "Waiting"]
    total_units = sum(p.reserved_units for p in mature_waiting)
    crystallized = total_units >= product.global_min_order
    return {
        "product_id": product_id,
        "product_name": product.name,
        "global_min_order": product.global_min_order,
        "total_mature_waiting_units": total_units,
        "crystallized": crystallized,
        "eligible_preorders": len(mature_waiting),
        "all_preorders": len(preorders),
    }
