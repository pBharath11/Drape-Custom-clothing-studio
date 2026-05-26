export type MeasurementUnit = "cm" | "in";

export interface Measurements {
  chest: number;
  waist: number;
  hips: number;
  length: number;
  shoulder: number;
  unit: MeasurementUnit;
}

export interface CartItem {
  id: string;
  clothingType: string;
  clothingLabel: string;
  colorId: string;
  colorHex: string;
  fabricId: string;
  designId: string;
  frontPrint?: string;
  backPrint?: string;
  measurements: Measurements;
  quantity: number;
}

export interface Address {
  id: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
}

export interface OrderItem {
  clothingType: string;
  clothingLabel: string;
  colorId: string;
  colorHex: string;
  fabricId: string;
  designId: string;
  frontPrint?: string;
  backPrint?: string;
  measurements: Measurements;
  quantity: number;
  unitPrice: number;
}

export type OrderStatus =
  | "processing"
  | "confirmed"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  paymentIntentId?: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  address: Address;
  subtotal: number;
  delivery: number;
  total: number;
  customerEmail?: string;
  customerName?: string;
}

export interface SavedCard {
  id: string;
  /** Stripe PaymentMethod ID — used for deletion and deduplication */
  stripePaymentMethodId?: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  addedAt: string;
}
