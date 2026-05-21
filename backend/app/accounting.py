"""
DSM Accounting Engine
Traduction exacte des formules Excel du sheet 'As Transactions'
Précision : 0.001% de marge d'erreur (Decimal pour éviter les float errors)
"""
from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass
from typing import List
from enum import Enum

ZERO = Decimal("0")
PREC = Decimal("0.00000001")

def d(v) -> Decimal:
    """Convertit en Decimal proprement"""
    if v is None:
        return ZERO
    return Decimal(str(v)).quantize(PREC, rounding=ROUND_HALF_UP)


class EventType(str, Enum):
    BUY_DSPS          = "BUY_DSPS"
    ORIGINATION       = "ORIGINATION"
    CANCELLATION      = "CANCELLATION"
    CLOSURE           = "CLOSURE"
    SUPPLIER_FAILED   = "SUPPLIER_FAILED"
    PREPAYMENT        = "PREPAYMENT"
    COMPLETION        = "COMPLETION"
    PREPAID_COMPLETION= "PREPAID_COMPLETION"
    DSM_FAILED        = "DSM_FAILED"


@dataclass
class JournalLine:
    event_type: str
    account_name: str
    debit: Decimal
    credit: Decimal
    account_type: str
    currency: str
    dsp_equivalent: Decimal
    note: str = ""


@dataclass
class PreorderData:
    """Représente les variables du data dictionary (lignes 1-4 du sheet)"""
    # ─── Fixed
    reserved_dsps: Decimal       # O  = reserved_units × dsps_per_unit
    deals_value: Decimal          # Q  = reserved_units × deal_price
    suppliers_value: Decimal      # R  = reserved_units × supplier_price
    deals_markup: Decimal         # S  = Q − R

    # ─── Variable (dépend du taux DSC courant)
    dsc_ruling_rate: Decimal      # H4 = taux DSC courant
    requisite_dsps: Decimal       # P  = reserved_units × (deal_price / taux_courant)
    excess_dsps: Decimal          # T  = max(O − P, 0)
    deficiency_dsps: Decimal      # U  = max(P − O, 0)

    # ─── Conditions B7–B13
    b7_cancelled: bool
    b8_deal_closed: bool
    b9_supplier_failed: bool
    b10_prepaid: bool
    b11_confirmed: bool
    b12_prepaid_confirmed: bool
    b13_dsm_failed: bool

    # ─── Config B14–B15
    b14_supplier_dsp_pct: Decimal  # ex: 0.10
    b15_dme_fiat: bool             # True=fiat, False=DSP


def compute_entries(p: PreorderData) -> List[JournalLine]:
    """
    Génère TOUTES les écritures comptables selon les conditions actives.
    Chaque bloc correspond exactement aux formules IF() du sheet Excel.
    """
    entries: List[JournalLine] = []
    H4 = p.dsc_ruling_rate
    O  = p.reserved_dsps
    P  = p.requisite_dsps
    Q  = p.deals_value
    R  = p.suppliers_value
    S  = p.deals_markup
    T  = p.excess_dsps
    B14 = p.b14_supplier_dsp_pct
    B15_fiat = p.b15_dme_fiat   # True = DME payé en Fiat (USD), False = en DSPs

    def neg(v): return -abs(v)
    def usd_to_dsp(v): return v / H4 if H4 > 0 else ZERO

    # ─────────────────────────────────────────────────────────────
    # BLOC 1 — Origination de la réservation (TOUJOURS généré)
    # R025: DR Preorderer DSP Wallet = O
    # R026: CR Preorderer Deal Reservation = O
    # ─────────────────────────────────────────────────────────────
    entries += [
        JournalLine(EventType.ORIGINATION, "Preorder's voucher Liability (code 2141)",
                    O, ZERO, "Current liability", "DSP", O,
                    "DR: DSPs bloqués depuis le portefeuille"),
        JournalLine(EventType.ORIGINATION, "Preorder Liabilities (code 2010)",
                    ZERO, O, "Current liability", "DSP", neg(O),
                    "CR: DSPs réservés pour le deal"),
    ]

    # ─────────────────────────────────────────────────────────────
    # BLOC 2 — Annulation par le preorderer (B7=1)
    # R030: DR Reservation account = IF(B7=1, O, 0)
    # R031: CR DSP Wallet          = IF(B7=1, O, 0)
    # ─────────────────────────────────────────────────────────────
    v = O if p.b7_cancelled else ZERO
    entries += [
        JournalLine(EventType.CANCELLATION, "Preorder Liabilities (code 2010)",
                    v, ZERO, "Current liability", "DSP", v,
                    "DR: libération de la réservation"),
        JournalLine(EventType.CANCELLATION, "Preorder's voucher Liability (code 2141)",
                    ZERO, v, "Current liability", "DSP", neg(v),
                    "CR: remboursement DSPs"),
    ]

    # ─────────────────────────────────────────────────────────────
    # BLOC 3 — Clôture du deal / vente des DSPs (B8=1)
    # R035: DR Reservation account    = IF(B8, O)
    # R036: CR Supplier USD escrow    = IF(B8, R*(1−B14))
    # R037: CR Supplier DSP escrow    = IF(B8, R/Q*P*B14)
    # R038: CR DSM margin payable (code 2120)     = IF(B8, S/Q*P*30%)
    # R039: CR DME Comm DSP           = IF(B8 AND NOT B15, S/Q*P*10%)
    # R040: CR DME Comm Fiat          = IF(B8 AND B15, S*10%)
    # R041: CR Members commissions    = IF(B8, S/Q*P*60%)
    # R042: CR Excess DSPs refunded   = IF(B8 AND T>0, T)
    # ─────────────────────────────────────────────────────────────
    b8 = p.b8_deal_closed
    r36 = (R * (1 - B14))           if b8 else ZERO
    r37 = (R / Q * P * B14)         if b8 and Q > 0 else ZERO
    r38 = (S / Q * P * d("0.30"))   if b8 and Q > 0 else ZERO
    r39 = (S / Q * P * d("0.10"))   if b8 and Q > 0 and not B15_fiat else ZERO
    r40 = (S * d("0.10"))           if b8 and B15_fiat else ZERO
    r41 = (S / Q * P * d("0.60"))   if b8 and Q > 0 else ZERO
    r42 = T                          if b8 and T > 0 else ZERO
    r35 = O                          if b8 else ZERO

    entries += [
        JournalLine(EventType.CLOSURE, "Preorder Liabilities (code 2010)",
                    r35, ZERO, "Current liability", "DSP", r35),
        JournalLine(EventType.CLOSURE, "Supplier Escrow Liability Fiat (code 2021)",
                    ZERO, r36, "Current liability", "USD",
                    neg(usd_to_dsp(r36))),
        JournalLine(EventType.CLOSURE, "Supplier's Voucher Liability (code 2142)",
                    ZERO, r37, "Current liability", "DSP", neg(r37)),
        JournalLine(EventType.CLOSURE, "DSM margin payable (code 2120)",
                    ZERO, r38, "Current liability", "DSP", neg(r38)),
        JournalLine(EventType.CLOSURE, "DME Commission payable (DSP)",
                    ZERO, r39, "Current liability", "DSP", neg(r39)),
        JournalLine(EventType.CLOSURE, "DME Commission payable (Fiat)",
                    ZERO, r40, "Current liability", "USD",
                    neg(usd_to_dsp(r40))),
        JournalLine(EventType.CLOSURE, "Members' commissions payable",
                    ZERO, r41, "Current liability", "DSP", neg(r41)),
        JournalLine(EventType.CLOSURE, "Preorder's voucher Liability (code 2141) (excess refunded)",
                    ZERO, r42, "Current liability", "DSP", neg(r42)),
    ]

    # ─────────────────────────────────────────────────────────────
    # BLOC 4 — Fournisseur ne livre pas (B9=1)
    # R046: DR Supplier USD escrow    = IF(B9, R*(1−B14))
    # R047: DR Supplier DSP escrow    = IF(B9, R/Q*P*B14)
    # R048: DR DSM margin payable (code 2120)     = IF(B9, S/Q*P*30%)
    # R049: DR DME Comm DSP           = IF(B9 AND NOT B15, S/Q*P*10%)
    # R050: DR DME Comm Fiat          = IF(B9 AND B15, S*10%)
    # R051: DR Members commissions    = IF(B9, S/Q*P*60%)
    # R052: CR Preorderer DSP wallet  = combiné DSP
    # R053: CR Preorderer USD payment = combiné USD
    # ─────────────────────────────────────────────────────────────
    b9 = p.b9_supplier_failed
    n46 = (R * (1 - B14))           if b9 else ZERO
    n47 = (R / Q * P * B14)         if b9 and Q > 0 else ZERO
    n48 = (S / Q * P * d("0.30"))   if b9 and Q > 0 else ZERO
    n49 = (S / Q * P * d("0.10"))   if b9 and Q > 0 and not B15_fiat else ZERO
    n50 = (S * d("0.10"))           if b9 and B15_fiat else ZERO
    n51 = (S / Q * P * d("0.60"))   if b9 and Q > 0 else ZERO
    n52 = n47 + n48 + n49 + n51     # CR DSP total refundé
    n53 = n46 + n50                  # CR USD total refundé

    entries += [
        JournalLine(EventType.SUPPLIER_FAILED, "Supplier Escrow Liability Fiat (code 2021)",
                    n46, ZERO, "Current liability", "USD", usd_to_dsp(n46)),
        JournalLine(EventType.SUPPLIER_FAILED, "Supplier's Voucher Liability (code 2142)",
                    n47, ZERO, "Current liability", "DSP", n47),
        JournalLine(EventType.SUPPLIER_FAILED, "DSM margin payable (code 2120)",
                    n48, ZERO, "Current liability", "DSP", n48),
        JournalLine(EventType.SUPPLIER_FAILED, "DME Commission payable (DSP)",
                    n49, ZERO, "Current liability", "DSP", n49),
        JournalLine(EventType.SUPPLIER_FAILED, "DME Commission payable (Fiat)",
                    n50, ZERO, "Current liability", "USD", usd_to_dsp(n50)),
        JournalLine(EventType.SUPPLIER_FAILED, "Members' commissions payable",
                    n51, ZERO, "Current liability", "DSP", n51),
        JournalLine(EventType.SUPPLIER_FAILED, "Preorder's voucher Liability (code 2141)",
                    ZERO, n52, "Current liability", "DSP", neg(n52)),
        JournalLine(EventType.SUPPLIER_FAILED, "Preorderer's USD payments",
                    ZERO, n53, "Current asset", "USD", neg(usd_to_dsp(n53))),
    ]

    # ─────────────────────────────────────────────────────────────
    # BLOC 5 — Prépaiement fournisseur (B10=1)
    # R057: DR Supplier advance USD   = IF(B10, R*(1−B14))
    # R058: DR Supplier advance DSP   = IF(B10, R/Q*P*B14)
    # R059: DR DME advance DSP        = IF(B10 AND NOT B15, S/Q*P*10%)
    # R060: DR DME advance USD        = IF(B10 AND B15, S*10%)
    # R061: CR DSM USD wallet (supp)  = IF(B10, R*(1−B14))
    # R062: CR DSM USD wallet (DME)   = IF(B10 AND B15, S*10%)
    # R063: CR Supplier DSP wallet    = IF(B10, R/Q*P*B14)
    # R064: CR DME DSP wallet         = IF(B10 AND NOT B15, S/Q*P*10%)
    # ─────────────────────────────────────────────────────────────
    b10 = p.b10_prepaid
    p57 = (R * (1 - B14))           if b10 else ZERO
    p58 = (R / Q * P * B14)         if b10 and Q > 0 else ZERO
    p59 = (S / Q * P * d("0.10"))   if b10 and Q > 0 and not B15_fiat else ZERO
    p60 = (S * d("0.10"))           if b10 and B15_fiat else ZERO
    p61 = p57
    p62 = p60
    p63 = p58
    p64 = p59

    entries += [
        JournalLine(EventType.PREPAYMENT, "Supplier Prepayment (code 1301)",
                    p57, ZERO, "Current asset", "USD", usd_to_dsp(p57)),
        JournalLine(EventType.PREPAYMENT, "Supplier Prepayment (code 1301)",
                    p58, ZERO, "Current asset", "DSP", p58),
        JournalLine(EventType.PREPAYMENT, "Other Prepayment (code 1302)",
                    p59, ZERO, "Current asset", "DSP", p59),
        JournalLine(EventType.PREPAYMENT, "Other Prepayment (code 1302)",
                    p60, ZERO, "Current asset", "USD", usd_to_dsp(p60)),
        JournalLine(EventType.PREPAYMENT, "DSM USD wallet (Supplier payment)",
                    ZERO, p61, "Current asset", "USD", neg(usd_to_dsp(p61))),
        JournalLine(EventType.PREPAYMENT, "DSM USD wallet (DME payment)",
                    ZERO, p62, "Current asset", "USD", neg(usd_to_dsp(p62))),
        JournalLine(EventType.PREPAYMENT, "Supplier's DSP wallet",
                    ZERO, p63, "Current liability", "DSP", neg(p63)),
        JournalLine(EventType.PREPAYMENT, "DME's DSP wallet",
                    ZERO, p64, "Current liability", "DSP", neg(p64)),
    ]

    # ─────────────────────────────────────────────────────────────
    # BLOC 6 — Complétion après confirmation preorderer (B11=1)
    # R067: DR Supplier USD escrow    = IF(B11, R*(1−B14))
    # R068: DR Supplier DSP escrow    = IF(B11, R/Q*P*B14)
    # R069: DR DSM margin payable (code 2120)     = IF(B11, S/Q*P*30%)
    # R070: DR DME Comm DSP           = IF(B11 AND NOT B15, S/Q*P*10%)
    # R071: DR DME Comm Fiat          = IF(B11 AND B15, S*10%)
    # R072: DR Members commissions    = IF(B11, S/Q*P*60%)
    # R073: CR DSM USD account        = IF(B11, R*(1−B14))
    # R074: CR Supplier DSP wallet    = IF(B11, R/Q*P*B14)
    # R075: CR DSM revenue            = IF(B11, S/Q*P*30%)
    # R076: CR DME DSP wallet         = IF(B11 AND NOT B15, S/Q*P*10%)
    # R077: CR DSM USD account (DME)  = IF(B11 AND B15, S*10%)
    # R078: CR Purchase commissions (code 2130)= IF(B11, S/Q*P*30%)
    # R079: CR Purchase commissions (code 2130)   = IF(B11, S/Q*P*30%)
    # ─────────────────────────────────────────────────────────────
    b11 = p.b11_confirmed
    c67 = (R * (1 - B14))           if b11 else ZERO
    c68 = (R / Q * P * B14)         if b11 and Q > 0 else ZERO
    c69 = (S / Q * P * d("0.30"))   if b11 and Q > 0 else ZERO
    c70 = (S / Q * P * d("0.10"))   if b11 and Q > 0 and not B15_fiat else ZERO
    c71 = (S * d("0.10"))           if b11 and B15_fiat else ZERO
    c72 = (S / Q * P * d("0.60"))   if b11 and Q > 0 else ZERO
    c73 = c67
    c74 = c68
    c75 = c69
    c76 = c70
    c77 = c71
    c78 = (S / Q * P * d("0.20"))   if b11 and Q > 0 else ZERO   # Recommendation Commission 20%
    c79 = (S / Q * P * d("0.30"))   if b11 and Q > 0 else ZERO   # Purchase commissions 30%
    c_dfm = (S / Q * P * d("0.10")) if b11 and Q > 0 else ZERO   # Leader Pool Monthly Payable 10%

    entries += [
        JournalLine(EventType.COMPLETION, "Supplier Escrow Liability Fiat (code 2021)",
                    c67, ZERO, "Current liability", "USD", usd_to_dsp(c67)),
        JournalLine(EventType.COMPLETION, "Supplier's Voucher Liability (code 2142)",
                    c68, ZERO, "Current liability", "DSP", c68),
        JournalLine(EventType.COMPLETION, "DSM margin payable (code 2120)",
                    c69, ZERO, "Current liability", "DSP", c69),
        JournalLine(EventType.COMPLETION, "DME Commission payable (DSP)",
                    c70, ZERO, "Current liability", "DSP", c70),
        JournalLine(EventType.COMPLETION, "DME Commission payable (Fiat)",
                    c71, ZERO, "Current liability", "USD", usd_to_dsp(c71)),
        JournalLine(EventType.COMPLETION, "Members' commissions payable",
                    c72, ZERO, "Current liability", "DSP", c72),
        JournalLine(EventType.COMPLETION, "DSM USD account (Supplier payment)",
                    ZERO, c73, "Current asset", "USD", neg(usd_to_dsp(c73))),
        JournalLine(EventType.COMPLETION, "Supplier's DSP wallet",
                    ZERO, c74, "Current liability", "DSP", neg(c74)),
        JournalLine(EventType.COMPLETION, "DSM revenue",
                    ZERO, c75, "Revenue", "DSP", neg(c75)),
        JournalLine(EventType.COMPLETION, "DME DSP wallet",
                    ZERO, c76, "Current liability", "DSP", neg(c76)),
        JournalLine(EventType.COMPLETION, "DSM USD account (DME payment)",
                    ZERO, c77, "Current liability", "USD", neg(usd_to_dsp(c77))),
        JournalLine(EventType.COMPLETION, "Recommendation Commission",
                    ZERO, c78, "Current liability", "DSP", neg(c78)),
        JournalLine(EventType.COMPLETION, "Purchase commissions (code 2130)",
                    ZERO, c79, "Purchase commissions (code 2130)", "DSP", neg(c79)),
        JournalLine(EventType.COMPLETION, "Leader Pool Monthly Payable (code 2160)",
                    ZERO, c_dfm, "Current liability", "DSP", neg(c_dfm)),
    ]

    # ─────────────────────────────────────────────────────────────
    # BLOC 7 — Complétion du deal prépayé (B10=1 AND B12=1)
    # R084: DR Supplier USD escrow    = IF(B10 AND B12, R*(1−B14))
    # R085: DR Supplier DSP escrow    = IF(B10 AND B12, R/Q*P*B14)
    # R086: DR DSM margin payable (code 2120)     = IF(B10 AND B12, S/Q*P*30%)
    # R087: DR DME Comm DSP           = IF(B12 AND NOT B15, S/Q*P*10%)
    # R088: DR DME Comm Fiat          = IF(B12 AND B15, S*10%)
    # R089: DR Members commissions    = IF(B10 AND B12, S/Q*P*60%)
    # R090: CR Supplier advance USD   = IF(B10 AND B12, R*(1−B14))
    # R091: CR Supplier advance DSP   = IF(B10 AND B12, R/Q*P*B14)
    # R092: CR DME advance DSP        = IF(B12 AND NOT B15, S/Q*P*10%)
    # R093: CR DME advance USD        = IF(B10 AND B15, S*10%)
    # R094: CR DSM revenues           = IF(B10 AND B12, S/Q*P*30%)
    # R095: CR Purchase commissions (code 2130)= IF(B10 AND B12, S/Q*P*30%)
    # R096: CR Purchase commissions (code 2130)   = IF(B10 AND B12, S/Q*P*30%)
    # ─────────────────────────────────────────────────────────────
    b10b12 = p.b10_prepaid and p.b12_prepaid_confirmed
    b12    = p.b12_prepaid_confirmed
    pc84 = (R * (1 - B14))            if b10b12 else ZERO
    pc85 = (R / Q * P * B14)          if b10b12 and Q > 0 else ZERO
    pc86 = (S / Q * P * d("0.30"))    if b10b12 and Q > 0 else ZERO
    pc87 = (S / Q * P * d("0.10"))    if b12 and Q > 0 and not B15_fiat else ZERO
    pc88 = (S * d("0.10"))            if b12 and B15_fiat else ZERO
    pc89 = (S / Q * P * d("0.60"))    if b10b12 and Q > 0 else ZERO
    pc90 = pc84
    pc91 = pc85
    pc92 = pc87
    pc93 = (S * d("0.10"))            if b10 and B15_fiat else ZERO
    pc94 = (S / Q * P * d("0.30"))    if b10b12 and Q > 0 else ZERO
    pc95 = (S / Q * P * d("0.20"))    if b10b12 and Q > 0 else ZERO   # Recommendation Commission 20%
    pc96 = (S / Q * P * d("0.30"))    if b10b12 and Q > 0 else ZERO   # Purchase commissions 30%
    pc_dfm = (S / Q * P * d("0.10"))  if b10b12 and Q > 0 else ZERO   # Leader Pool Monthly Payable 10%

    entries += [
        JournalLine(EventType.PREPAID_COMPLETION, "Supplier Escrow Liability Fiat (code 2021)",
                    pc84, ZERO, "Current liability", "USD", usd_to_dsp(pc84)),
        JournalLine(EventType.PREPAID_COMPLETION, "Supplier's Voucher Liability (code 2142)",
                    pc85, ZERO, "Current liability", "DSP", pc85),
        JournalLine(EventType.PREPAID_COMPLETION, "DSM margin payable (code 2120)",
                    pc86, ZERO, "Current liability", "DSP", pc86),
        JournalLine(EventType.PREPAID_COMPLETION, "DME Commission payable (DSP)",
                    pc87, ZERO, "Current liability", "DSP", pc87),
        JournalLine(EventType.PREPAID_COMPLETION, "DME Commission payable (Fiat)",
                    pc88, ZERO, "USD", "USD", usd_to_dsp(pc88)),
        JournalLine(EventType.PREPAID_COMPLETION, "Members' commissions payable",
                    pc89, ZERO, "Current liability", "DSP", pc89),
        JournalLine(EventType.PREPAID_COMPLETION, "Supplier Prepayment (code 1301)",
                    ZERO, pc90, "Current asset", "USD", neg(usd_to_dsp(pc90))),
        JournalLine(EventType.PREPAID_COMPLETION, "Supplier Prepayment (code 1301)",
                    ZERO, pc91, "Current asset", "DSP", neg(pc91)),
        JournalLine(EventType.PREPAID_COMPLETION, "Other Prepayment (code 1302)",
                    ZERO, pc92, "Current asset", "DSP", neg(pc92)),
        JournalLine(EventType.PREPAID_COMPLETION, "Other Prepayment (code 1302)",
                    ZERO, pc93, "Current asset", "USD", neg(usd_to_dsp(pc93))),
        JournalLine(EventType.PREPAID_COMPLETION, "DSM revenues",
                    ZERO, pc94, "Revenue", "DSP", neg(pc94)),
        JournalLine(EventType.PREPAID_COMPLETION, "Recommendation Commission",
                    ZERO, pc95, "Current liability", "DSP", neg(pc95)),
        JournalLine(EventType.PREPAID_COMPLETION, "Purchase commissions (code 2130)",
                    ZERO, pc96, "Purchase commissions (code 2130)", "DSP", neg(pc96)),
        JournalLine(EventType.PREPAID_COMPLETION, "Leader Pool Monthly Payable (code 2160)",
                    ZERO, pc_dfm, "Current liability", "DSP", neg(pc_dfm)),
    ]

    # ─────────────────────────────────────────────────────────────
    # BLOC 8 — DSM échoue à juger le litige (B13=1)
    # R101: DR Supplier expense (USD) = IF(B13, R*(1−B14))
    # R102: DR Supplier expense (DSP) = IF(B13, R/Q*P*B14)
    # R103: CR Supplier USD wallet    = IF(B13, R*(1−B14))
    # R104: CR Supplier DSP wallet    = IF(B13, R/Q*P*B14)
    # ─────────────────────────────────────────────────────────────
    b13 = p.b13_dsm_failed
    d101 = (R * (1 - B14))           if b13 else ZERO
    d102 = (R / Q * P * B14)         if b13 and Q > 0 else ZERO
    d103 = d101
    d104 = d102

    entries += [
        JournalLine(EventType.DSM_FAILED, "Supplier's expense account (USD)",
                    d101, ZERO, "Expense", "USD", usd_to_dsp(d101)),
        JournalLine(EventType.DSM_FAILED, "Supplier's expense account (DSP)",
                    d102, ZERO, "Expense", "DSP", d102),
        JournalLine(EventType.DSM_FAILED, "Supplier's USD wallet",
                    ZERO, d103, "Current liability", "USD", neg(usd_to_dsp(d103))),
        JournalLine(EventType.DSM_FAILED, "Supplier's DSP wallet",
                    ZERO, d104, "Current liability", "DSP", neg(d104)),
    ]

    return entries


def validate_balance(entries: List[JournalLine], event_type: str) -> dict:
    """Vérifie que chaque bloc d'écritures est équilibré (DR = CR en DSP)"""
    filtered = [e for e in entries if e.event_type == event_type]
    total_dsp_eq = sum(e.dsp_equivalent for e in filtered)
    balanced = abs(total_dsp_eq) < Decimal("0.01")
    return {
        "event": event_type,
        "total_dsp_equivalent": float(total_dsp_eq),
        "balanced": balanced,
        "entry_count": len(filtered)
    }
