from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, require_admin
from app.accounting import compute_entries, validate_balance, PreorderData, EventType
import random

router = APIRouter(prefix="/preorders", tags=["Preorders"])

ZERO = Decimal("0")

def _build_preorder_data(po: models.Preorder) -> PreorderData:
    return PreorderData(
        reserved_dsps=Decimal(str(po.reserved_dsps)),
        deals_value=Decimal(str(po.deals_value)),
        suppliers_value=Decimal(str(po.suppliers_value)),
        deals_markup=Decimal(str(po.deals_markup)),
        dsc_ruling_rate=Decimal(str(po.dsc_ruling_rate)),
        requisite_dsps=Decimal(str(po.requisite_dsps)),
        excess_dsps=Decimal(str(po.excess_dsps)),
        deficiency_dsps=Decimal(str(po.deficiency_dsps)),
        currency=(po.currency or "USD"),
        fx_rate_to_usd=Decimal(str(po.fx_rate_to_usd or 1)),
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

def _recompute_variable_fields(po: models.Preorder, dsc_rate: Decimal):
    """Recalcule tous les champs variables quand le taux DSC change"""
    deal_price = Decimal(str(po.deal_price))
    tier_pct = Decimal(str(po.tier_pct))
    units = po.reserved_units
    supplier_price = Decimal(str(po.supplier_price))

    fx = Decimal(str(po.fx_rate_to_usd or 1))
    deal_price_usd = deal_price * fx
    current_reservation_rate = tier_pct * dsc_rate
    dsps_needed_per_unit = deal_price_usd / dsc_rate if dsc_rate > 0 else ZERO
    requisite_dsps = dsps_needed_per_unit * units
    reserved_dsps = Decimal(str(po.reserved_dsps))
    excess_dsps = max(reserved_dsps - requisite_dsps, ZERO)
    deficiency_dsps = max(requisite_dsps - reserved_dsps, ZERO)
    orig_rate = Decimal(str(po.original_reservation_rate))

    # Maturity: original reservation rate <= current DSC ruling rate
    # (i.e. tier_pct × H_original <= H_current)
    maturity = "Mature" if orig_rate <= dsc_rate else "Immature"

    po.dsc_ruling_rate = dsc_rate
    po.current_reservation_rate = current_reservation_rate
    po.dsps_needed_per_unit = dsps_needed_per_unit
    po.requisite_dsps = requisite_dsps
    po.excess_dsps = excess_dsps
    po.deficiency_dsps = deficiency_dsps
    po.maturity_status = maturity

    # Recalcule deals_value, suppliers_value, deals_markup avec les requisite_dsps (P)
    po.deals_value = units * deal_price
    po.suppliers_value = units * supplier_price
    po.deals_markup = Decimal(str(po.deals_value)) - Decimal(str(po.suppliers_value))

def _recompute_journal(db: Session, po: models.Preorder):
    """Supprime et régénère toutes les écritures comptables"""
    for e in po.journal_entries:
        db.delete(e)
    db.flush()
    data = _build_preorder_data(po)
    lines = compute_entries(data)
    for line in lines:
        je = models.JournalEntry(
            preorder_id=po.id,
            event_type=line.event_type,
            account_name=line.account_name,
            debit=line.debit,
            credit=line.credit,
            account_type=line.account_type,
            currency=line.currency,
            dsp_equivalent=line.dsp_equivalent,
            note=line.note,
        )
        db.add(je)

def _update_deal_status(po: models.Preorder):
    if po.b7_cancelled:
        po.deal_status = "Cancelled"
    elif po.b12_prepaid_confirmed or po.b11_confirmed:
        po.deal_status = "Completed"
    elif po.b10_prepaid:
        po.deal_status = "Prepaid"
    elif po.b8_deal_closed:
        po.deal_status = "Closed"
    elif po.b9_supplier_failed:
        po.deal_status = "SupplierFailed"
    elif po.b13_dsm_failed:
        po.deal_status = "DSMFailed"
    else:
        po.deal_status = "Waiting"

@router.post("/", response_model=schemas.PreorderOut)
def create_preorder(data: schemas.PreorderCreate, db: Session = Depends(get_db),
                    current_user=Depends(get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == data.product_id).first()
    if not product or not product.is_active:
        raise HTTPException(404, "Produit introuvable ou inactif")
    option = db.query(models.ReservationOption).filter(
        models.ReservationOption.id == data.option_id,
        models.ReservationOption.product_id == data.product_id
    ).first()
    if not option:
        raise HTTPException(404, "Option de réservation introuvable")
    if data.reserved_units < product.personal_min_order:
        raise HTTPException(400, f"Minimum {product.personal_min_order} unité(s) par commande")

    deal_price = Decimal(str(product.deal_price))
    supplier_price = Decimal(str(product.supplier_price))
    dsc_rate = Decimal(str(product.dsc_ruling_rate))
    fx = Decimal(str(product.fx_rate_to_usd or 1))
    deal_price_usd = deal_price * fx
    tier_pct = Decimal(str(option.tier_pct))
    units = data.reserved_units

    dsps_per_unit = Decimal(str(option.dsps_per_unit))
    reserved_dsps = dsps_per_unit * units
    orig_rate = Decimal(str(option.reservation_rate))
    current_rate = tier_pct * dsc_rate
    dsps_needed = deal_price_usd / dsc_rate if dsc_rate > 0 else ZERO
    requisite_dsps = dsps_needed * units
    excess_dsps = max(reserved_dsps - requisite_dsps, ZERO)
    deficiency_dsps = max(requisite_dsps - reserved_dsps, ZERO)
    deals_value = deal_price * units
    suppliers_value = supplier_price * units
    deals_markup = deals_value - suppliers_value

    # Vérifie solde DSP
    if Decimal(str(current_user.dsp_balance)) < reserved_dsps:
        raise HTTPException(400, f"Solde DSP insuffisant. Nécessaire: {reserved_dsps}, Disponible: {current_user.dsp_balance}")

    unique_id = int(datetime.utcnow().timestamp() * 1000) + random.randint(0, 999)

    po = models.Preorder(
        unique_id=unique_id,
        user_id=current_user.id,
        product_id=data.product_id,
        option_id=data.option_id,
        tier_pct=tier_pct,
        original_reservation_rate=orig_rate,
        supplier_price=supplier_price,
        deal_price=deal_price,
        currency=(product.currency or "USD"),
        fx_rate_to_usd=fx,
        reserved_units=units,
        reserved_dsps_per_unit=dsps_per_unit,
        min_order=product.global_min_order,
        reserved_dsps=reserved_dsps,
        deals_value=deals_value,
        suppliers_value=suppliers_value,
        deals_markup=deals_markup,
        current_reservation_rate=current_rate,
        dsc_ruling_rate=dsc_rate,
        dsps_needed_per_unit=dsps_needed,
        requisite_dsps=requisite_dsps,
        excess_dsps=excess_dsps,
        deficiency_dsps=deficiency_dsps,
        b14_supplier_dsp_pct=data.b14_supplier_dsp_pct,
        b15_dme_fiat=data.b15_dme_fiat,
        maturity_status="Mature" if orig_rate <= dsc_rate else "Immature",
        deal_status="Waiting",
    )
    db.add(po)
    db.flush()

    # Débit du wallet DSP
    current_user.dsp_balance = Decimal(str(current_user.dsp_balance)) - reserved_dsps

    _recompute_journal(db, po)
    db.commit()
    db.refresh(po)
    return po


@router.get("/", response_model=list[schemas.PreorderOut])
def list_my_preorders(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(models.Preorder).filter(models.Preorder.user_id == current_user.id).all()


@router.get("/all", response_model=list[schemas.PreorderOut])
def list_all_preorders(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return db.query(models.Preorder).all()


@router.get("/{preorder_id}", response_model=schemas.PreorderOut)
def get_preorder(preorder_id: int, db: Session = Depends(get_db),
                 current_user=Depends(get_current_user)):
    po = db.query(models.Preorder).filter(models.Preorder.id == preorder_id).first()
    if not po:
        raise HTTPException(404, "Précommande introuvable")
    if po.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Accès refusé")
    return po


@router.put("/{preorder_id}/conditions", response_model=schemas.PreorderOut)
def update_conditions(preorder_id: int, data: schemas.ConditionUpdate,
                      db: Session = Depends(get_db), admin=Depends(require_admin)):
    """
    Endpoint admin : change les conditions B7–B15 et/ou le taux DSC,
    puis régénère les écritures comptables automatiquement.
    """
    po = db.query(models.Preorder).filter(models.Preorder.id == preorder_id).first()
    if not po:
        raise HTTPException(404, "Précommande introuvable")

    # ─── Garde-fou : si le deal est Immature, on bloque les conditions B7-B13
    # Seuls B14/B15 (config) et new_dsc_rate (qui peut justement rendre mature) restent autorisés.
    condition_fields = [
        "b7_cancelled","b8_deal_closed","b9_supplier_failed","b10_prepaid",
        "b11_confirmed","b12_prepaid_confirmed","b13_dsm_failed",
    ]
    if po.maturity_status == "Immature":
        attempted = [f for f in condition_fields if getattr(data, f, None) is not None]
        if attempted:
            raise HTTPException(
                400,
                f"Deal Immature — conditions bloquées ({', '.join(attempted)}). "
                "Modifie d'abord le taux DSC pour le rendre Mature."
            )

    # ─── Snapshot de l'état AVANT modification : le gel ne s'applique que
    # si le deal était DÉJÀ closed avant cette requête.
    was_already_closed = any([
        po.b8_deal_closed, po.b9_supplier_failed, po.b10_prepaid,
        po.b11_confirmed, po.b12_prepaid_confirmed, po.b13_dsm_failed,
    ])

    # Met à jour les conditions
    fields = condition_fields + ["b14_supplier_dsp_pct","b15_dme_fiat"]
    for f in fields:
        v = getattr(data, f, None)
        if v is not None:
            setattr(po, f, v)

    # ─── Gel des données : si le deal ÉTAIT DÉJÀ "closed" (B8–B13 actif
    # AVANT cette requête), on ne recompute NI les champs variables
    # (P, T, U, maturity) NI les écritures comptables.
    # Mais si on VIENT de fermer le deal (B8–B13 passé de 0→1), on doit
    # recalculer pour que le journal reflète les nouvelles conditions.
    if not was_already_closed:
        # Met à jour le taux DSC si fourni
        if data.new_dsc_rate is not None:
            _recompute_variable_fields(po, Decimal(str(data.new_dsc_rate)))
        else:
            _recompute_variable_fields(po, Decimal(str(po.dsc_ruling_rate)))
        _recompute_journal(db, po)

    _update_deal_status(po)
    po.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(po)
    return po


@router.get("/{preorder_id}/validate", response_model=list[schemas.ValidationResult])
def validate_journal(preorder_id: int, db: Session = Depends(get_db),
                     admin=Depends(require_admin)):
    """Vérifie l'équilibre DR=CR pour chaque bloc d'écritures"""
    po = db.query(models.Preorder).filter(models.Preorder.id == preorder_id).first()
    if not po:
        raise HTTPException(404, "Précommande introuvable")
    data = _build_preorder_data(po)
    lines = compute_entries(data)
    events = [e.value for e in EventType]
    return [validate_balance(lines, ev) for ev in events]


@router.get("/{preorder_id}/journal", response_model=list[schemas.JournalEntryOut])
def get_journal(preorder_id: int, event_type: str = None,
                db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    po = db.query(models.Preorder).filter(models.Preorder.id == preorder_id).first()
    if not po:
        raise HTTPException(404, "Précommande introuvable")
    if po.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Accès refusé")
    q = db.query(models.JournalEntry).filter(models.JournalEntry.preorder_id == preorder_id)
    if event_type:
        q = q.filter(models.JournalEntry.event_type == event_type)
    return q.all()


@router.delete("/{preorder_id}")
def delete_preorder(preorder_id: int,
                    db: Session = Depends(get_db),
                    current_user=Depends(get_current_user)):
    """
    Supprime définitivement une précommande et toutes ses écritures comptables.
    - Le propriétaire ou un admin peut supprimer.
    - Les DSPs réservés sont restitués au wallet du preorderer (sauf si le deal est Closed/Completed
      et que les DSPs ont déjà été transférés vers les escrows).
    """
    po = db.query(models.Preorder).filter(models.Preorder.id == preorder_id).first()
    if not po:
        raise HTTPException(404, "Précommande introuvable")
    if po.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Accès refusé")

    # Restituer les DSPs réservés au wallet du propriétaire si le deal n'est pas fermé
    owner = db.query(models.User).filter(models.User.id == po.user_id).first()
    if owner and po.deal_status in ("Waiting", "Cancelled", "DSMFailed"):
        owner.dsp_balance = Decimal(str(owner.dsp_balance)) + Decimal(str(po.reserved_dsps))

    # Cascade delete journal_entries (déjà géré par cascade="all, delete-orphan" dans le modèle)
    db.delete(po)
    db.commit()
    return {"status": "deleted", "preorder_id": preorder_id, "dsps_refunded": str(po.reserved_dsps) if owner and po.deal_status in ("Waiting", "Cancelled", "DSMFailed") else "0"}
