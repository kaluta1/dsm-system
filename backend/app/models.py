from sqlalchemy import Column, Integer, String, Boolean, Numeric, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    dsp_balance = Column(Numeric(24, 8), default=0)
    usd_balance = Column(Numeric(24, 8), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    preorders = relationship("Preorder", back_populates="user")


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    image_url = Column(String)
    supplier_price = Column(Numeric(24, 8), nullable=False)   # wholesale price
    deal_price = Column(Numeric(24, 8), nullable=False)        # retail + markup
    supplier_min_order = Column(Integer, nullable=False)       # supplier requirement
    global_min_order = Column(Integer, nullable=False)         # 120% of above
    personal_min_order = Column(Integer, default=1)
    dsc_ruling_rate = Column(Numeric(24, 8), nullable=False)   # current DSC/USD rate
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reservation_options = relationship("ReservationOption", back_populates="product", cascade="all, delete-orphan")
    preorders = relationship("Preorder", back_populates="product")


class ReservationOption(Base):
    """Table 1(a) — each tier row"""
    __tablename__ = "reservation_options"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    tier_pct = Column(Numeric(10, 4), nullable=False)          # 0.10, 0.50, ... 100
    reservation_rate = Column(Numeric(24, 8), nullable=False)  # tier_pct × dsc_ruling_rate
    dsps_per_unit = Column(Numeric(24, 8), nullable=False)     # deal_price / reservation_rate
    usd_equivalent = Column(Numeric(24, 8), nullable=False)    # dsc_ruling_rate × dsps_per_unit
    product = relationship("Product", back_populates="reservation_options")


class Preorder(Base):
    """A's Transactions — data dictionary rows 1-4 + conditions B7-B15"""
    __tablename__ = "preorders"
    id = Column(Integer, primary_key=True, index=True)
    unique_id = Column(BigInteger, unique=True, nullable=False)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    option_id = Column(Integer, ForeignKey("reservation_options.id"), nullable=False)

    # ── Fixed values (never change after reservation)
    reservation_time = Column(DateTime(timezone=True), server_default=func.now())
    tier_pct = Column(Numeric(10, 4), nullable=False)
    original_reservation_rate = Column(Numeric(24, 8), nullable=False)
    supplier_price = Column(Numeric(24, 8), nullable=False)
    deal_price = Column(Numeric(24, 8), nullable=False)
    reserved_units = Column(Integer, nullable=False)
    reserved_dsps_per_unit = Column(Numeric(24, 8), nullable=False)
    min_order = Column(Integer, nullable=False)
    reserved_dsps = Column(Numeric(24, 8), nullable=False)     # O = units × dsps_per_unit
    deals_value = Column(Numeric(24, 8), nullable=False)       # Q = units × deal_price
    suppliers_value = Column(Numeric(24, 8), nullable=False)   # R = units × supplier_price
    deals_markup = Column(Numeric(24, 8), nullable=False)      # S = Q − R

    # ── Variable values (update when DSC rate changes)
    current_reservation_rate = Column(Numeric(24, 8), nullable=False)
    dsc_ruling_rate = Column(Numeric(24, 8), nullable=False)   # H4
    dsps_needed_per_unit = Column(Numeric(24, 8), nullable=False)
    requisite_dsps = Column(Numeric(24, 8), nullable=False)    # P = units × dsps_needed_per_unit
    excess_dsps = Column(Numeric(24, 8), nullable=False)       # T = max(O − P, 0)
    deficiency_dsps = Column(Numeric(24, 8), nullable=False, default=0)  # U = max(P − O, 0)

    # ── Conditions B7–B13 (boolean flags)
    b7_cancelled = Column(Boolean, default=False)
    b8_deal_closed = Column(Boolean, default=False)
    b9_supplier_failed = Column(Boolean, default=False)
    b10_prepaid = Column(Boolean, default=False)
    b11_confirmed = Column(Boolean, default=False)
    b12_prepaid_confirmed = Column(Boolean, default=False)
    b13_dsm_failed = Column(Boolean, default=False)

    # ── Config params B14–B15
    b14_supplier_dsp_pct = Column(Numeric(5, 4), default=0.10)  # % paid to supplier in DSPs
    b15_dme_fiat = Column(Boolean, default=True)                 # True=fiat, False=DSP

    # ── Computed status
    maturity_status = Column(String, default="Mature")
    crystallization_status = Column(String, default="NonCrystallized")
    deal_status = Column(String, default="Waiting")

    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="preorders")
    product = relationship("Product", back_populates="preorders")
    option = relationship("ReservationOption")
    journal_entries = relationship("JournalEntry", back_populates="preorder", cascade="all, delete-orphan")


class JournalEntry(Base):
    """One debit or credit line in the accounting journal"""
    __tablename__ = "journal_entries"
    id = Column(Integer, primary_key=True, index=True)
    preorder_id = Column(Integer, ForeignKey("preorders.id"), nullable=False)

    # Which event triggered this entry
    event_type = Column(String, nullable=False)
    # ORIGINATION | BUY_DSPS | CANCELLATION | CLOSURE |
    # SUPPLIER_FAILED | PREPAYMENT | COMPLETION | PREPAID_COMPLETION | DSM_FAILED

    account_name = Column(String, nullable=False)
    debit = Column(Numeric(24, 8), default=0)
    credit = Column(Numeric(24, 8), default=0)
    account_type = Column(String)
    currency = Column(String)        # DSP | USD
    dsp_equivalent = Column(Numeric(24, 8), default=0)
    note = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    preorder = relationship("Preorder", back_populates="journal_entries")
