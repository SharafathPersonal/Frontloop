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
      message_templates: {
        Row: MessageTemplate;
        Insert: MessageTemplateInsert;
        Update: Partial<MessageTemplateInsert>;
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
  | 'insufficient_credits'
  | 'paused_logout';

export type CustomerTag = 'VIP' | 'Regular' | 'New' | 'DIGITAL_BILL';

export type WhatsAppConnectionMode = 'META_API' | 'QR_EXPRESS' | 'NONE';

export interface Shop {
  id: string;                 // uuid — mirrors auth.users.id
  shop_name: string;
  slug?: string | null;       // URL-safe slug for public-facing pages
  owner_phone: string;
  contact_number?: string | null;
  location_address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  is_blocked?: boolean;
  industry_type: string;
  meta_access_token?: string | null;
  meta_phone_number_id?: string | null;
  meta_business_account_id?: string | null;
  meta_template_name?: string | null;
  whatsapp_mode: WhatsAppConnectionMode;
  anti_ban_delay: number;
  qr_express_status?: string | null;
  logo_url?: string | null;
  invoice_theme_color?: string | null;
  invoice_footer_note?: string | null;
  gst_number: string | null;
  brand_story?: string | null;
  created_at: string;         // ISO 8601 timestamp
}

export type ShopInsert = Omit<Shop, 'id' | 'created_at' | 'whatsapp_mode' | 'anti_ban_delay'> & {
  id?: string;
  created_at?: string;
  whatsapp_mode?: WhatsAppConnectionMode;
  anti_ban_delay?: number;
};

export type ShopUpdate = Partial<ShopInsert>;

export interface Wallet {
  shop_id: string;            // FK → shops.id
  credits_remaining: number;  // bigint, always >= 0
  credits_used: number;       // bigint, tracks used credits
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
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_failed: number;
  failure_reason?: string | null;
  dispatch_mode: WhatsAppConnectionMode;
  created_at: string;
}

export type CampaignInsert = Omit<Campaign, 'id' | 'created_at' | 'status' | 'dispatch_mode'> & {
  id?: string;
  created_at?: string;
  status?: CampaignStatus;
  dispatch_mode?: WhatsAppConnectionMode;
};

export type CampaignUpdate = Partial<Omit<Campaign, 'id' | 'shop_id'>>;



export interface Customer {
  id: string;           // uuid
  shop_id: string;      // FK → shops.id
  customer_name: string;
  whatsapp_number: string; 
  tags: CustomerTag[];
  is_saved_to_phone?: boolean;
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

export type TemplateStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TemplateCategory = 'MARKETING' | 'UTILITY';

export interface MessageTemplate {
  id: string;
  shop_id: string;
  template_name: string;
  category: TemplateCategory;
  header_type?: 'IMAGE' | 'NONE' | null;
  body_text: string;
  status: TemplateStatus;
  image_url?: string | null;
  rejection_reason?: string | null;
  meta_template_id?: string | null;
  updated_at?: string | null;
  created_at: string;
}

export type MessageTemplateInsert = Omit<MessageTemplate, 'id' | 'created_at' | 'status'> & {
  id?: string;
  created_at?: string;
  status?: TemplateStatus;
  rejection_reason?: string | null;
  meta_template_id?: string | null;
  updated_at?: string | null;
};

// ------------------------------------------------------------------
// 3. APPLICATION-LAYER DATA TRANSFER OBJECTS
// ------------------------------------------------------------------

/** Form values submitted from the Campaign Creator UI */
export interface CampaignFormValues {
  title: string;
  message_body: string;
  image_url?: string;
  template_name?: string;
}

/** A single parsed contact row from a CSV upload */
export interface ParsedContact {
  name: string;
  phone: string;
}

/** The full payload sent to the broadcast dispatcher (tag-based targeting) */
export interface BroadcastPayload {
  campaign: CampaignFormValues;
  targetTags?: CustomerTag[];
  targetSource?: 'TAGS' | 'QR_LEADS' | 'CSV';
  csvData?: ParsedContact[];
  creditsRequired: number;
  templateParams?: Record<string, string>;
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
  contact_number?: string;
  location_address?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
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

// ------------------------------------------------------------------
// 7. FLASH OFFERS DOMAIN TYPES
// ------------------------------------------------------------------

export interface FlashOffer {
  id: string;
  shop_id: string;
  product_name: string;
  offer_description?: string | null;
  original_price: number;
  discount_price: number;
  show_percentage_badge: boolean;
  show_discount_price: boolean;
  is_active: boolean;
  is_deleted: boolean;
  views_count: number;
  push_sent_count?: number;
  push_opened_count?: number;
  push_shared_count?: number;
  image_url?: string | null;
  start_at: string;
  end_at?: string | null;
  status: 'draft' | 'active' | 'expired';
  push_sent: boolean;
  created_at: string;
  updated_at: string;
}

export type FlashOfferInsert = Omit<FlashOffer, 'id' | 'created_at' | 'updated_at' | 'views_count' | 'is_deleted' | 'status' | 'push_sent'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  views_count?: number;
  is_deleted?: boolean;
  status?: 'draft' | 'active' | 'expired';
  push_sent?: boolean;
};

export type FlashOfferUpdate = Partial<Omit<FlashOffer, 'id' | 'shop_id' | 'created_at'>>;
