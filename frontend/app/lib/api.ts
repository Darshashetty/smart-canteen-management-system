/**
 * Smart Canteen API Client
 * Connects Next.js frontend to Express backend at localhost:5000
 */

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api`;

// ─── Token Management ─────────────────────────────────
let authToken: string | null = null;

export const setToken = (token: string | null) => {
  authToken = token;
  if (token) {
    if (typeof window !== "undefined") localStorage.setItem("sc_token", token);
  } else {
    if (typeof window !== "undefined") localStorage.removeItem("sc_token");
  }
};

export const getToken = (): string | null => {
  if (authToken) return authToken;
  if (typeof window !== "undefined") {
    authToken = localStorage.getItem("sc_token");
  }
  return authToken;
};

// ─── Fetch Wrapper ─────────────────────────────────────
async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await res.json();

  if (!res.ok) {
    const detailsText = Array.isArray(json.details)
      ? json.details
          .map((item: { field?: string; message?: string } | string) =>
            typeof item === "string"
              ? item
              : `${item.field || "request"}: ${item.message || "invalid value"}`
          )
          .join("; ")
      : json.details && typeof json.details === "object"
      ? Object.entries(json.details)
          .map(([field, value]) => `${field}: ${String(value)}`)
          .join("; ")
      : typeof json.details === "string"
      ? json.details
      : "";

    // Prefer the human-readable server message (e.g. "Order has already been
    // collected.", "Order is currently in 'Placed' status..."). Validation
    // errors use a generic message, so append their per-field details.
    const isGenericMessage = !json.message || json.message === "Input validation failed";
    const message = isGenericMessage
      ? [json.message, detailsText].filter(Boolean).join(" — ")
      : json.message;

    throw new Error(message || detailsText || `API Error ${res.status}`);
  }

  return json;
}

// ─── Auth APIs ─────────────────────────────────────────
export interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    account_status: string;
    phone: string;
    smart_card_balance?: number;
  };
}

export const authAPI = {
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string, phone?: string) =>
    apiFetch<LoginResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, phone }),
    }),

  getMe: () => apiFetch<{ message: string; user: any }>("/auth/me"),

  getPreferences: () =>
    apiFetch<{ data: Record<string, boolean | number | string> }>("/auth/preferences"),

  updatePreferences: (preferences: Record<string, boolean | number | string>) =>
    apiFetch<{ data: Record<string, boolean | number | string> }>("/auth/preferences", {
      method: "PATCH",
      body: JSON.stringify(preferences),
    }),

  topUpSmartCard: (amount: number) =>
    apiFetch<{ message: string; data: { smart_card_balance: number; amount: number } }>(
      "/auth/smart-card/topup",
      {
        method: "POST",
        body: JSON.stringify({ amount }),
      }
    ),
};

// ─── Menu APIs ─────────────────────────────────────────
export interface BackendMenuItem {
  _id: string;
  item_id?: string;
  item_name: string;
  category: string;
  price: number;
  available_quantity: number;
  preparation_time: number;
  status: string;
  image: string;
  total_orders_count?: number;
}

export const menuAPI = {
  getAll: (params?: { category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return apiFetch<{ data: BackendMenuItem[] }>(`/menu${qs ? `?${qs}` : ""}`);
  },

  getById: (id: string) =>
    apiFetch<{ data: BackendMenuItem }>(`/menu/${id}`),

  create: (item: {
    item_name: string;
    category: string;
    price: number;
    available_quantity: number;
    preparation_time: number;
    status?: string;
    image?: string;
  }) =>
    apiFetch<{ data: BackendMenuItem }>("/menu", {
      method: "POST",
      body: JSON.stringify(item),
    }),

  update: (id: string, item: any) =>
    apiFetch<{ data: BackendMenuItem }>(`/menu/${id}`, {
      method: "PUT",
      body: JSON.stringify(item),
    }),

  updateStock: (id: string, available_quantity: number, status?: string) =>
    apiFetch<{ data: BackendMenuItem }>(`/menu/${id}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ available_quantity, ...(status ? { status } : {}) }),
    }),

  delete: (id: string) =>
    apiFetch(`/menu/${id}`, { method: "DELETE" }),
};

// ─── Order APIs ────────────────────────────────────────
export interface BackendOrderItem {
  order_item_id?: string;
  item_id: string;
  item_name: string;
  quantity: number;
  price: number;
  special_instruction?: string;
}

export interface BackendOrder {
  _id: string;
  order_id: string;
  customer_id: string;
  customer_name: string;
  token_number: string;
  qr_code?: string;
  items: BackendOrderItem[];
  total_amount: number;
  order_time: string;
  pickup_slot: string;
  pickup_time?: string;
  estimated_ready_time: string;
  order_status: string;
  payment_status?: string;
  payment_method?: string;
  priority_score?: number;
  is_delayed?: boolean;
  delay_reason?: string;
  history?: any[];
}

export const orderAPI = {
  create: (data: {
    items: { item_id: string; quantity: number; special_instruction?: string }[];
    pickup_slot?: string;
    pickup_time?: string;
    idempotency_key?: string;
    payment_method?: string;
  }) =>
    apiFetch<{ data: BackendOrder; eta?: any }>("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAll: (params?: { status?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return apiFetch<{ data: BackendOrder[] }>(`/orders${qs ? `?${qs}` : ""}`);
  },

  getById: (id: string) =>
    apiFetch<{ data: BackendOrder }>(`/orders/${id}`),

  getQR: (id: string) =>
    apiFetch<{ data: { qr_code: string; token_number: string; order_id: string } }>(
      `/orders/${id}/qr`
    ),

  cancel: (id: string, reason?: string) =>
    apiFetch<{ data: BackendOrder }>(`/orders/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || "Cancelled by customer" }),
    }),

  getPickupSlots: () =>
    apiFetch<{
      data: { slot: string; booked: number; remaining: number; capacity: number; status: string }[];
    }>("/orders/pickup-slots"),

  clearPickupSlot: (slot: string) =>
    apiFetch<{ data: { slot: string; booked: number }; message: string }>("/orders/pickup-slots/clear", {
      method: "POST",
      body: JSON.stringify({ slot }),
    }),

  deallocateSlot: (slot: string, date?: string) =>
    apiFetch<{
      data: { slot: string; date: string; booked: number; released: number };
      message: string;
    }>("/orders/pickup-slots/deallocate", {
      method: "POST",
      body: JSON.stringify(date ? { slot, date } : { slot }),
    }),

  resetPickupSlots: (date?: string) =>
    apiFetch<{
      data: { date: string; slotsReset: number; released: number; booked: number };
      message: string;
    }>("/orders/pickup-slots/reset", {
      method: "POST",
      body: JSON.stringify(date ? { date } : {}),
    }),

  reorder: (id: string) =>
    apiFetch<{
      message: string;
      data: {
        original_order_id: string;
        items: Array<{
          item_id: string;
          item_name: string;
          category?: string;
          quantity: number;
          price: number;
          available_quantity: number;
          special_instruction?: string;
          image?: string;
          price_changed?: boolean;
          original_price?: number;
        }>;
        out_of_stock_items: Array<{
          item_id: string;
          item_name: string;
          requested_quantity: number;
          available_quantity: number;
          reason?: string;
        }>;
        subtotal: number;
        has_unavailable_items: boolean;
        can_proceed: boolean;
      };
    }>(`/orders/${id}/reorder`, {
      method: "POST",
    }),

  updatePaymentStatus: (id: string, payment_status: string, payment_method?: string) =>
    apiFetch<{ data: BackendOrder }>(`/orders/${id}/payment`, {
      method: "PATCH",
      body: JSON.stringify({ payment_status, ...(payment_method ? { payment_method } : {}) }),
    }),

  updatePickupTime: (id: string, data: { pickup_time?: string; pickup_slot?: string }) =>
    apiFetch<{ data: BackendOrder; message: string }>(`/orders/${id}/pickup-time`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ─── Queue APIs ────────────────────────────────────────
export const queueAPI = {
  getLive: () =>
    apiFetch<{ data: BackendOrder[] }>("/queue/live"),

  updateStatus: (id: string, status: string, delay_reason?: string) =>
    apiFetch<{ data: BackendOrder }>(`/queue/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...(delay_reason ? { delay_reason } : {}) }),
    }),

  markDelayed: (id: string) =>
    apiFetch<{ data: BackendOrder }>(`/queue/${id}/delayed`, {
      method: "PATCH",
    }),
};

// ─── Collection APIs ───────────────────────────────────
export const collectionAPI = {
  verify: (data: { token_number?: string; order_id?: string; qr_payload?: string }) =>
    apiFetch<{ message: string; can_collect: boolean; data: BackendOrder }>("/collection/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  confirm: (data: { order_id?: string; token_number?: string }) =>
    apiFetch<{ data: BackendOrder }>("/collection/confirm", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  markNotCollected: (id: string) =>
    apiFetch(`/collection/${id}/not-collected`, { method: "PATCH" }),
};

// ─── Analytics APIs ────────────────────────────────────
export const analyticsAPI = {
  getDashboard: () =>
    apiFetch<{ data: any }>("/analytics/dashboard"),

  getReports: () =>
    apiFetch<{ data: any }>("/analytics/reports"),
};

// ─── AI APIs ───────────────────────────────────────────
export const aiAPI = {
  getDemandPrediction: () => apiFetch<{ data: any }>("/ai/demand-prediction"),
  getPeakTimePrediction: () => apiFetch<{ data: any }>("/ai/peak-time-prediction"),
  getPrepForecast: () => apiFetch<{ data: any }>("/ai/prep-forecasting"),
  getRecommendations: () => apiFetch<{ data: any }>("/ai/recommendations"),
  getWastePrediction: () => apiFetch<{ data: any }>("/ai/waste-prediction"),
  getDelayPrediction: () => apiFetch<{ data: any }>("/ai/delay-prediction"),
  getSalesInsights: () => apiFetch<{ data: any }>("/ai/sales-insights"),
};

// ─── Manager APIs (Phase 4: Manager Permissions) ──────
export const managerAPI = {
  getStaff: () => apiFetch<{ data: any[]; count: number }>("/manager/staff"),

  createStaff: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    account_status?: string;
  }) =>
    apiFetch<{ data: any; message: string }>("/manager/staff", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateStaff: (
    id: string,
    data: { name?: string; phone?: string; account_status?: string; password?: string }
  ) =>
    apiFetch<{ data: any; message: string }>(`/manager/staff/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteStaff: (id: string) =>
    apiFetch<{ data: any; message: string }>(`/manager/staff/${id}`, {
      method: "DELETE",
    }),
};

// ─── Admin APIs ────────────────────────────────────────
export const adminAPI = {
  getUsers: () => apiFetch<{ data: any[] }>("/admin/users"),
  updateUserRoleStatus: (id: string, data: { role?: string; account_status?: string }) =>
    apiFetch(`/admin/users/${id}/role-status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getSettings: () => apiFetch<{ data: any }>("/admin/settings"),
  updateSettings: (data: any) =>
    apiFetch("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getLogs: () => apiFetch<{ data: any[] }>("/admin/logs"),

  // Categories CRUD (Phase 5)
  getCategories: () => apiFetch<{ data: any[]; count: number }>("/admin/categories"),
  createCategory: (data: { name: string; description?: string; icon?: string; image?: string; is_active?: boolean }) =>
    apiFetch<{ data: any; message: string }>("/admin/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCategory: (id: string, data: { name?: string; description?: string; icon?: string; image?: string; is_active?: boolean }) =>
    apiFetch<{ data: any; message: string }>(`/admin/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: string) =>
    apiFetch<{ data: any; message: string }>(`/admin/categories/${id}`, {
      method: "DELETE",
    }),

  // Canteen Hubs CRUD (Phase 5)
  getCanteens: () => apiFetch<{ data: any[]; count: number }>("/admin/canteens"),
  createCanteen: (data: { name: string; location: string; opening_time?: string; closing_time?: string; is_active?: boolean; contact_number?: string }) =>
    apiFetch<{ data: any; message: string }>("/admin/canteens", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCanteen: (id: string, data: { name?: string; location?: string; opening_time?: string; closing_time?: string; is_active?: boolean; contact_number?: string }) =>
    apiFetch<{ data: any; message: string }>(`/admin/canteens/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCanteen: (id: string) =>
    apiFetch<{ data: any; message: string }>(`/admin/canteens/${id}`, {
      method: "DELETE",
    }),
};


// ─── Field Mappers (backend snake_case → frontend camelCase) ──

import type { MenuItem, Order, OrderItem, PickupSlot } from "../types";
import { getMenuImage, normalizeMenuCategory } from "./image";

export function mapBackendMenuItem(b: BackendMenuItem): MenuItem {
  const rawAvailableQuantity = Number((b as any).stockQuantity ?? b.available_quantity ?? 0);
  const quantity = Number.isFinite(rawAvailableQuantity) ? rawAvailableQuantity : 0;
  const backendStatus = String(b.status ?? "").trim();
  const isExplicitlyAvailable = (b as any).isAvailable !== undefined ? Boolean((b as any).isAvailable) : undefined;
  const derivedStatus: MenuItem["status"] =
    isExplicitlyAvailable === false || backendStatus === "Sold Out" || quantity <= 0
      ? "Sold Out"
      : backendStatus === "Temporarily Unavailable"
      ? "Temporarily Unavailable"
      : quantity <= 5
      ? "Limited"
      : "Available";

  const itemName = String((b as any).item_name ?? (b as any).name ?? "Menu item").trim();
  const category = normalizeMenuCategory((b as any).category);
  const preparationTime = Number((b as any).preparation_time ?? (b as any).preparationTime ?? 5);

  return {
    id: String((b as any)._id ?? (b as any).item_id ?? ""),
    name: itemName,
    category,
    price: Number(b.price ?? 0),
    image: getMenuImage((b as any).image, category, itemName),
    availableQuantity: quantity,
    preparationTime: Number.isFinite(preparationTime) ? preparationTime : 5,
    status: derivedStatus,
    description: String((b as any).description ?? `Fresh ${itemName} prepared daily.`),
    isVegetarian: category.toLowerCase() === "meals" || category.toLowerCase() === "salads" || category.toLowerCase() === "desserts",
    isFastPrep: preparationTime <= 5,
    underFive: Number(b.price ?? 0) < 500,
    isPopular: (b.total_orders_count || (b as any).total_orders_count || 0) > 100,
    calories: undefined,
  };
}

export function mapBackendOrder(b: BackendOrder): Order {
  const statusToProgress: Record<string, number> = {
    Placed: 15,
    Accepted: 35,
    Preparing: 65,
    Ready: 100,
    Collected: 100,
    Completed: 100,
    Delayed: 50,
    Cancelled: 0,
    Rejected: 0,
    "Not Collected": 100,
  };

  return {
    id: b._id || b.order_id,
    tokenNumber: b.token_number,
    qrCode: b.qr_code,
    customerId: b.customer_id,
    customerName: b.customer_name,
    items: b.items.map(
      (it): OrderItem => ({
        id: it.order_item_id || it.item_id,
        menuItemId: it.item_id,
        name: it.item_name,
        price: it.price,
        quantity: it.quantity,
        specialInstruction: it.special_instruction || "",
      })
    ),
    totalAmount: b.total_amount,
    orderTime: new Date(b.order_time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    pickupSlot: b.pickup_slot || "",
    estimatedReadyTime: b.estimated_ready_time
      ? new Date(b.estimated_ready_time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    prepProgress: statusToProgress[b.order_status] || 15,
    status: b.order_status as Order["status"],
    paymentStatus: (b.payment_status
      ? (b.payment_status.charAt(0).toUpperCase() + b.payment_status.slice(1).toLowerCase())
      : "Pending") as any,
    paymentMethod: b.payment_method || "cash_on_counter",
    pickupCounter: "Counter Station B — Hot Express",
    isDelayed: b.is_delayed,
    delayReason: b.delay_reason,
  };
}

export function mapBackendSlot(b: {
  slot: string;
  available?: number;
  totalCapacity?: number;
  remaining?: number;
  capacity?: number;
  selectable?: boolean;
  status?: string;
}): PickupSlot {
  const maxCapacity = Number(b.totalCapacity ?? b.capacity ?? 20) || 20;
  const available = Number(b.available ?? b.remaining ?? maxCapacity);

  return {
    id: `slot-${b.slot}`,
    timeSlot: b.slot,
    maxCapacity,
    currentOrders: Math.max(0, maxCapacity - available),
    isAvailable: b.selectable ?? available > 0,
    stationName: "Counter Station B — Hot Express",
    status: b.status,
  };
}
