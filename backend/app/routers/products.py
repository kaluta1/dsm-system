from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from app.database import get_db
from app import models, schemas
from app.auth import require_admin, get_current_user

router = APIRouter(prefix="/products", tags=["Products"])

# 14 tiers de réservation selon le sheet Excel 1(a)
TIER_PERCENTAGES = [
    Decimal("0.10"), Decimal("0.50"), Decimal("0.70"), Decimal("0.90"),
    Decimal("1.00"), Decimal("1.20"), Decimal("1.50"), Decimal("2.00"),
    Decimal("2.50"), Decimal("3.00"), Decimal("5.00"), Decimal("8.00"),
    Decimal("10.00"), Decimal("100.00"),
]

def build_options(product: models.Product):
    """Génère les tiers de réservation (table 1a) pour un produit"""
    options = []
    H = Decimal(str(product.dsc_ruling_rate))
    deal_price = Decimal(str(product.deal_price))
    for pct in TIER_PERCENTAGES:
        reservation_rate = pct * H
        dsps_per_unit = deal_price / reservation_rate if reservation_rate > 0 else Decimal("0")
        usd_equivalent = H * dsps_per_unit
        options.append(models.ReservationOption(
            product_id=product.id,
            tier_pct=pct,
            reservation_rate=reservation_rate,
            dsps_per_unit=dsps_per_unit,
            usd_equivalent=usd_equivalent,
        ))
    return options

@router.get("/", response_model=list[schemas.ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).filter(models.Product.is_active == True).all()

@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Produit introuvable")
    return p

@router.post("/", response_model=schemas.ProductOut)
def create_product(data: schemas.ProductCreate, db: Session = Depends(get_db),
                   admin=Depends(require_admin)):
    if data.deal_price <= data.supplier_price:
        raise HTTPException(400, "deal_price doit être supérieur à supplier_price (S = Q − R > 0)")
    global_min = int(data.supplier_min_order * 1.2)
    p = models.Product(
        name=data.name,
        description=data.description,
        image_url=data.image_url,
        supplier_price=data.supplier_price,
        deal_price=data.deal_price,
        supplier_min_order=data.supplier_min_order,
        global_min_order=global_min,
        dsc_ruling_rate=data.dsc_ruling_rate,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    options = build_options(p)
    for o in options:
        db.add(o)
    db.commit()
    db.refresh(p)
    return p

@router.put("/{product_id}/dsc-rate", response_model=schemas.ProductOut)
def update_dsc_rate(product_id: int, data: schemas.DscRateUpdate,
                    db: Session = Depends(get_db), admin=Depends(require_admin)):
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Produit introuvable")
    p.dsc_ruling_rate = data.new_rate
    # Recalcule les options
    for o in p.reservation_options:
        db.delete(o)
    db.commit()
    options = build_options(p)
    for o in options:
        db.add(o)
    db.commit()
    db.refresh(p)
    return p
