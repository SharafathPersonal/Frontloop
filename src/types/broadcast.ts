// ============================================================
// TRUE ATTENDLY BROADCAST — Unified TypeScript Interface Layer
// ============================================================

// ------------------------------------------------------------------
// 1. RAW DATABASE SHAPE (mirrors Supabase PostgreSQL schema exactly)
// ------------------------------------------------------------------

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      shops: {
        Row: Shop;
        Insert: ShopInsert;
        Update: ShopUpdate;
      };
      wallets: {
        Row: Wallet;
        Insert: WalletInsert;
        Update: WalletUpdate;
      };
      campaigns: {
        Row: Campaign;
        Insert: CampaignInsert;
        Update: CampaignUpdate;
      };
      customers_master: {
        Row: Customer;
        Insert: CustomerInsert;
        Update: Partial<CustomerInsert>;
      };
      payment_logs: {
        Row: PaymentLog;
        Insert: PaymentLogInsert;
        Update: Partial<PaymentLogInsert>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      campaign_status: CampaignStatus;
    };
  };
}

// ------------------------------------------------------------------
// 2. DOMAIN ENTITY TYPES
// ------------------------------------------------------------------

export type CampaignStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'insufficient_credits';

export type CustomerTag = string; // e.g., 'VIP', 'Regular', 'New'

export interface Shop {
  id: string;                 // uuid — mirrors auth.users.id
  shop_name: string;
  owner_phone: string;
  industry_type: string;
  meta_access_token?: string | null;
  meta_phone_number_id?: string | null;
  meta_business_account_id?: string | null;
  meta_template_name?: string | null;
  created_at: string;         // ISO 8601 timestamp
}

export type ShopInsert = Omit<Shop, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type ShopUpdate = Partial<ShopInsert>;

export interface Wallet {
  shop_id: string;            // FK → shops.id
  credits_remaining: number;  // bigint, always >= 0
  updated_at: string;
}

export type WalletInsert = Omit<Wallet, 'updated_at'> & { updated_at?: string };
export type WalletUpdate = Partial<WalletInsert>;

export interface Campaign {
  id: string;                 // uuid
  shop_id: string;            // FK → shops.id
  title: string;
  message_body: string;
  image_url: string | null;
  status: CampaignStatus;
  total_recipients: number;
  created_at: string;
}

export type CampaignInsert = Omit<Campaign, 'id' | 'created_at' | 'status'> & {
  id?: string;
  created_at?: string;
  status?: CampaignStatus;
};

export type CampaignUpdate = Partial<Omit<Campaign, 'id' | 'shop_id'>>;

export interface Customer {
  id: string;           // uuid
  shop_id: string;      // FK → shops.id
  customer_name: string;
  whatsapp_number: string; 
  tags: CustomerTag[];
  created_at: string;
}

export type CustomerInsert = Omit<Customer, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export interface PaymentLog {
  id: string;
  shop_id: string;
  order_id: string;
  amount: number;
  credits_credited: number;
  payment_status: string;
  created_at: string;
}

export type PaymentLogInsert = Omit<PaymentLog, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ------------------------------------------------------------------
// 3. APPLICATION-LAYER DATA TRANSFER OBJECTS
// ------------------------------------------------------------------

/** Form values submitted from the Campaign Creator UI */
export interface CampaignFormValues {
  title: string;
  message_body: string;
  image_url?: string;
}

/** A single parsed contact row from a CSV upload */
export interface ParsedContact {
  name: string;
  phone: string;
}

/** The full payload sent to the broadcast dispatcher (tag-based targeting) */
export interface BroadcastPayload {
  campaign: CampaignFormValues;
  targetTags: CustomerTag[];
  creditsRequired: number;
}

/** Credit check result before dispatching */
export interface CreditCheckResult {
  sufficient: boolean;
  creditsAvailable: number;
  creditsRequired: number;
  deficit: number;
}

// ------------------------------------------------------------------
// 4. AUTH FORM VALUE TYPES
// ------------------------------------------------------------------

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  shop_name: string;
  owner_phone: string;
  industry_type: string;
}

// ------------------------------------------------------------------
// 5. DASHBOARD / UI COMPOSITE TYPES
// ------------------------------------------------------------------

/** Enriched shop with wallet data — used in dashboard context */
export interface ShopContext {
  shop: Shop;
  wallet: Wallet;
}

/** Stats cards shown on the main dashboard panel */
export interface DashboardMetric {
  label: string;
  value: string | number;
  delta?: string;
  trend?: 'up' | 'down' | 'neutral';
}

/** Nav link item for the sidebar */
export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

// ------------------------------------------------------------------
// 6. API RESPONSE ENVELOPE
// ------------------------------------------------------------------

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
