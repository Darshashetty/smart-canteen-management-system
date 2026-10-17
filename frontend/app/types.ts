export type UserRole = 'customer' | 'kitchen' | 'manager' | 'admin';

export type OrderStatus =
  | 'Placed'
  | 'Accepted'
  | 'Preparing'
  | 'Ready'
  | 'Collected'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected'
  | 'Delayed'
  | 'Not Collected';

export type ItemStatus = 'Available' | 'Limited' | 'Sold Out' | 'Temporarily Unavailable';

export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  availableQuantity: number;
  preparationTime: number; // in minutes
  status: ItemStatus;
  description?: string;
  isVegetarian?: boolean;
  isFastPrep?: boolean;
  underFive?: boolean;
  isPopular?: boolean;
  calories?: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstruction: string;
}

export interface PickupSlot {
  id: string;
  timeSlot: string; // e.g. "1:15 PM – 1:30 PM"
  maxCapacity: number;
  currentOrders: number;
  isAvailable: boolean;
  stationName: string;
  status?: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstruction?: string;
  image?: string;
}

export interface Order {
  id: string;
  tokenNumber: string; // e.g. "C-023"
  qrCode?: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  orderTime: string;
  pickupSlot: string;
  estimatedReadyTime: string;
  prepProgress: number; // 0 to 100
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string;
  pickupCounter: string;
  specialNotes?: string;
  isDelayed?: boolean;
  delayReason?: string;
  delayAlertSent?: boolean;
}

export interface CustomerPreferences {
  vegetarianOnly: boolean;
  veganOnly: boolean;
  glutenFree: boolean;
  nutAllergyWarning: boolean;
  preferredPickupSlot: string;
  maxDailyBudget: number;
  notifyOnReady: boolean;
  notifyOnDelay: boolean;
}

export interface AIInsight {
  id: string;
  title: string;
  type: 'demand' | 'waste' | 'delay' | 'recommendation' | 'sales';
  description: string;
  actionableTip: string;
  confidence: number;
  timestamp: string;
}

export interface CanteenStats {
  totalOrdersToday: number;
  activeOrders: number;
  preparingOrders: number;
  readyOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalSalesToday: number;
  avgPrepTimeMinutes: number;
  peakOrderingTime: string;
  popularItems: { name: string; count: number }[];
}
