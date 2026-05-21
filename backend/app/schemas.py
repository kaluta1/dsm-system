from pydantic import BaseModel, EmailStr
from typing import Optional, List
from decimal import Decimal
from datetime import datetime


# ── Auth
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    is_admin: bool = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool
    dsp_balance: Decimal
    usd_balance: Decimal
    created_at: datetime
    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ── Products
class ReservationOptionOut(BaseModel):
    id: int
    tier_pct: Decimal
    reservation_rate: Decimal
    dsps_per_unit: Decimal
    usd_equivalent: Decimal
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
    id: int
    name: str
    description: Optional[str]
    image_url: Optional[str]
    supplier_price: Decimal
    deal_price: Decimal
    supplier_min_order: int
    global_min_order: int
    personal_min_order: int
    dsc_ruling_rate: Decimal
    is_active: bool
    reservation_options: List[ReservationOptionOut] = []
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Preorders
class PreorderCreate(BaseModel):
    product_id: int
    option_id: int
    reserved_units: int
    b14_supplier_dsp_pct: Decimal = Decimal("0.10")
    b15_dme_fiat: bool = True

class ConditionUpdate(BaseModel):
    b7_cancelled: Optional[bool] = None
    b8_deal_closed: Optional[bool] = None
    b9_supplier_failed: Optional[bool] = None
    b10_prepaid: Optional[bool] = None
    b11_confirmed: Optional[bool] = None
    b12_prepaid_confirmed: Optional[bool] = None
    b13_dsm_failed: Optional[bool] = None
    b14_supplier_dsp_pct: Optional[Decimal] = None
    b15_dme_fiat: Optional[bool] = None
    new_dsc_rate: Optional[Decimal] = None   # pour mettre à jour le taux DSC

class JournalEntryOut(BaseModel):
    id: int
    event_type: str
    account_name: str
    debit: Decimal
    credit: Decimal
    account_type: Optional[str]
    currency: Optional[str]
    dsp_equivalent: Decimal
    note: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}

class PreorderOut(BaseModel):
    id: int
    unique_id: int
    user_id: int
    product_id: int
    option_id: int
    reservation_time: datetime
    tier_pct: Decimal
    original_reservation_rate: Decimal
    supplier_price: Decimal
    deal_price: Decimal
    reserved_units: int
    reserved_dsps_per_unit: Decimal
    min_order: int
    reserved_dsps: Decimal
    deals_value: Decimal
    suppliers_value: Decimal
    deals_markup: Decimal
    current_reservation_rate: Decimal
    dsc_ruling_rate: Decimal
    dsps_needed_per_unit: Decimal
    requisite_dsps: Decimal
    excess_dsps: Decimal
    deficiency_dsps: Decimal
    b7_cancelled: bool
    b8_deal_closed: bool
    b9_supplier_failed: bool
    b10_prepaid: bool
    b11_confirmed: bool
    b12_prepaid_confirmed: bool
    b13_dsm_failed: bool
    b14_supplier_dsp_pct: Decimal
    b15_dme_fiat: bool
    maturity_status: str
    crystallization_status: str
    deal_status: str
    updated_at: Optional[datetime]
    journal_entries: List[JournalEntryOut] = []
    model_config = {"from_attributes": True}


# ── Admin top-up
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
