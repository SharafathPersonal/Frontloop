export interface BrandPresetColor {
  name: string;
  hex: string;
  bg: string;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
}

export interface AudienceMember {
  name: string;
  phone: string;
  tags: string[];
  visits: number;
  spend: number;
  credit: number;
}

export interface LedgerUsage {
  id: string;
  type: string;
  desc: string;
  date: string;
  credits: string;
  status: string;
}

export interface CashfreeLog {
  id: string;
  date: string;
  tokens: string;
  amount: string;
  status: string;
}

export interface ParsedContact {
  name: string;
  rawPhone: string;
  maskedPhone: string;
  status: string;
}
