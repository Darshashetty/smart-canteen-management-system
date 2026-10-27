"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import {
  MenuItem,
  CartItem,
  Order,
  PickupSlot,
  CustomerPreferences,
  UserRole,
  AIInsight,
  CanteenStats,
  OrderStatus,
  ItemStatus,
} from "../types";
import {
  authAPI,
  menuAPI,
  orderAPI,
  queueAPI,
  setToken,
  getToken,
  mapBackendMenuItem,
  mapBackendOrder,
  mapBackendSlot,
  LoginResponse,
} from "../lib/api";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  smartCardBalance?: number;
  studentId?: string;
}

const backendRoleToFrontendRole = (r: string): UserRole => {
  if (r === "staff") return "kitchen";
  return r as UserRole;
};

// Default credentials for each role (matching backend seed data)
const DEFAULT_CREDENTIALS: Record<UserRole, { email: string; password: string; name: string }> = {
  customer: { email: "customer@canteen.com", password: "password123", name: "Student Customer" },
  kitchen: { email: "staff@canteen.com", password: "password123", name: "Kitchen Chef / Staff" },
  manager: { email: "manager@canteen.com", password: "password123", name: "Canteen Manager" },
  admin: { email: "admin@canteen.com", password: "password123", name: "System Administrator" },
};

// Default rich menu items with high-res photos as default fallback
const INITIAL_RICH_MENU: MenuItem[] = [
  {
    id: "item-1001",
    name: "Chicken Deluxe Burger",
    category: "Fast Food",
    price: 4.5,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 25,
    preparationTime: 8,
    status: "Available",
    description: "Crispy chicken patty, cheddar cheese, crisp lettuce & house brioche bun.",
    isVegetarian: false,
    isFastPrep: false,
    underFive: true,
    isPopular: true,
  },
  {
    id: "item-1002",
    name: "Golden Crispy Fries",
    category: "Fast Food",
    price: 2.0,
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 35,
    preparationTime: 5,
    status: "Available",
    description: "Seasoned sea-salt golden crinkle cut potato fries.",
    isVegetarian: true,
    isFastPrep: true,
    underFive: true,
    isPopular: true,
  },
  {
    id: "item-1003",
    name: "Cold Drink 500ml",
    category: "Beverages",
    price: 1.0,
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 50,
    preparationTime: 2,
    status: "Available",
    description: "Chilled refreshing beverage of your choice.",
    isVegetarian: true,
    isFastPrep: true,
    underFive: true,
    isPopular: true,
  },
  {
    id: "item-1004",
    name: "Club Sandwich Supreme",
    category: "Fast Food",
    price: 3.8,
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 20,
    preparationTime: 7,
    status: "Available",
    description: "Triple-decker toasted sandwich with chicken, egg, and fresh veggies.",
    isVegetarian: false,
    isFastPrep: false,
    underFive: true,
    isPopular: true,
  },
  {
    id: "item-1005",
    name: "Chicken Shawarma Wrap",
    category: "Fast Food",
    price: 3.2,
    image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 18,
    preparationTime: 6,
    status: "Available",
    description: "Spiced marinated chicken with garlic tahini sauce in fresh pita.",
    isVegetarian: false,
    isFastPrep: false,
    underFive: true,
    isPopular: true,
  },
  {
    id: "item-1006",
    name: "Fresh Garden Salad Bowl",
    category: "Meals",
    price: 2.5,
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 15,
    preparationTime: 4,
    status: "Available",
    description: "Crisp greens, cucumbers, tomatoes, feta, and vinaigrette.",
    isVegetarian: true,
    isFastPrep: true,
    underFive: true,
    isPopular: false,
  },
  {
    id: "item-1007",
    name: "Hot Cappuccino",
    category: "Beverages",
    price: 1.8,
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 40,
    preparationTime: 3,
    status: "Available",
    description: "Freshly brewed espresso with steamed velvety milk foam.",
    isVegetarian: true,
    isFastPrep: true,
    underFive: true,
    isPopular: true,
  },
  {
    id: "item-1008",
    name: "Artisanal Veggie Buddha Bowl",
    category: "Meals",
    price: 4.2,
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 14,
    preparationTime: 9,
    status: "Available",
    description: "Quinoa, avocado, roasted chickpea, fresh kale, and tahini drizzle.",
    isVegetarian: true,
    isFastPrep: false,
    underFive: true,
    isPopular: false,
  },
  {
    id: "item-1009",
    name: "Classic Iced Matcha Latte",
    category: "Beverages",
    price: 2.6,
    image: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 30,
    preparationTime: 4,
    status: "Available",
    description: "Ceremonial grade Uji matcha with chilled oat milk.",
    isVegetarian: true,
    isFastPrep: true,
    underFive: true,
    isPopular: true,
  },
  {
    id: "item-1010",
    name: "Spicy Paneer Tikka Wrap",
    category: "Meals",
    price: 3.4,
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 16,
    preparationTime: 8,
    status: "Available",
    description: "Grilled cottage cheese cubes, mint chutney in flatbread.",
    isVegetarian: true,
    isFastPrep: false,
    underFive: true,
    isPopular: false,
  },
  {
    id: "item-1011",
    name: "Double Chocolate Fudge Brownie",
    category: "Desserts",
    price: 2.2,
    image: "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 22,
    preparationTime: 3,
    status: "Available",
    description: "Warm fudgy chocolate brownie with dark chocolate chips.",
    isVegetarian: true,
    isFastPrep: true,
    underFive: true,
    isPopular: true,
  },
  {
    id: "item-1012",
    name: "Smokey BBQ Beef Burger",
    category: "Fast Food",
    price: 5.2,
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 18,
    preparationTime: 10,
    status: "Available",
    description: "Angus beef patty, crispy beef bacon, BBQ glaze & onion rings.",
    isVegetarian: false,
    isFastPrep: false,
    underFive: false,
    isPopular: true,
  },
  {
    id: "item-1013",
    name: "Crispy Chicken Zinger Roll",
    category: "Fast Food",
    price: 3.6,
    image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 20,
    preparationTime: 6,
    status: "Available",
    description: "Crunchy fried chicken fillet with spicy mayonnaise wrapped in paratha.",
    isVegetarian: false,
    isFastPrep: false,
    underFive: true,
    isPopular: true,
  },
  {
    id: "item-1014",
    name: "Mango Passion Fruit Cooler",
    category: "Beverages",
    price: 1.9,
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 35,
    preparationTime: 3,
    status: "Available",
    description: "Chilled sparkling tropical fruit punch with fresh mint.",
    isVegetarian: true,
    isFastPrep: true,
    underFive: true,
    isPopular: true,
  },
  {
    id: "item-1015",
    name: "Cheesy Garlic Bread Sticks",
    category: "Snacks",
    price: 2.4,
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 28,
    preparationTime: 6,
    status: "Available",
    description: "Baked bread brushed with garlic herb butter and mozzarella.",
    isVegetarian: true,
    isFastPrep: false,
    underFive: true,
    isPopular: true,
  },
  {
    id: "item-1016",
    name: "Velvety Red Velvet Pastry",
    category: "Desserts",
    price: 2.5,
    image: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=600&q=80",
    availableQuantity: 15,
    preparationTime: 2,
    status: "Available",
    description: "Soft red velvet sponge slice layered with cream cheese frosting.",
    isVegetarian: true,
    isFastPrep: true,
    underFive: true,
    isPopular: false,
  },
];

// Fallback AI insights (used when AI API fails or returns empty)
const FALLBACK_AI_INSIGHTS: AIInsight[] = [
  {
    id: "ai-1",
    title: "Rush Window Peak Demand Forecast",
    type: "demand",
    description: "Chicken Burger demand is predicted to spike by +35% during 1:00 PM – 1:30 PM.",
    actionableTip: "Pre-cook 10 chicken patties before 12:55 PM to keep queue waiting time under 6 minutes.",
    confidence: 94,
    timestamp: "Just now",
  },
  {
    id: "ai-2",
    title: "Kitchen Delay Prevention Alert",
    type: "delay",
    description: "Counter Station B has 8 active hot orders queued simultaneously.",
    actionableTip: "Re-route simple cold beverage orders (e.g. Matcha Latte) to Express Pickup Counter.",
    confidence: 88,
    timestamp: "5 mins ago",
  },
  {
    id: "ai-3",
    title: "Food Waste Reduction Recommendation",
    type: "waste",
    description: "Paneer Tikka Wraps were over-prepared yesterday by 4 portions.",
    actionableTip: "Cap initial batch prep to 8 units today; replenish only if stock dips below 3.",
    confidence: 91,
    timestamp: "15 mins ago",
  },
];

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => Promise<void>;
  currentUser: UserAccount;
  login: (role: UserRole, credentials?: { email: string; password: string }) => Promise<LoginResponse>;
  logout: () => void;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  loginPromptOpen: boolean;
  loginPromptMessage: string;
  promptLogin: (message?: string) => void;
  dismissLoginPrompt: () => void;
  menu: MenuItem[];
  saveMenuItem: (item: Partial<MenuItem> & { id?: string }) => void;
  deleteMenuItem: (itemId: string) => void;
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  updateCartQty: (itemId: string, delta: number) => void;
  updateCartInstruction: (itemId: string, note: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  slots: PickupSlot[];
  refreshSlots: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  topUpSmartCard: (amount: number) => Promise<boolean>;
  selectedSlotId: string;
  setSelectedSlotId: (slotId: string) => void;
  orders: Order[];
  placeOrder: (slotId: string, paymentMethod?: string) => Order | null;
  reorderPastOrder: (order: Order) => Promise<{ success: boolean; outOfStockItems: string[] }>;
  updateOrderStatus: (orderId: string, status: OrderStatus, options?: { skipBackend?: boolean }) => void;
  activeOrder: Order | null;
  preferences: CustomerPreferences;
  updatePreferences: (prefs: Partial<CustomerPreferences>) => void;
  aiInsights: AIInsight[];
  stats: CanteenStats;
  toggleItemStatus: (itemId: string) => void;
  updateItemStock: (itemId: string, newStock: number) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>("customer");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState<boolean>(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState<string>(
    "Please log in to place an order and reserve a pickup slot."
  );
  const [currentUser, setCurrentUser] = useState<UserAccount>({
    id: "",
    name: "Guest",
    email: "",
    role: "customer",
  });

  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_RICH_MENU);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [aiInsights] = useState<AIInsight[]>(FALLBACK_AI_INSIGHTS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<CustomerPreferences>({
    vegetarianOnly: false,
    veganOnly: false,
    glutenFree: false,
    nutAllergyWarning: true,
    preferredPickupSlot: "1:15 PM – 1:30 PM",
    maxDailyBudget: 15,
    notifyOnReady: true,
    notifyOnDelay: true,
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const promptLogin = useCallback((message?: string) => {
    if (message) setLoginPromptMessage(message);
    setLoginPromptOpen(true);
  }, []);

  const dismissLoginPrompt = useCallback(() => {
    setLoginPromptOpen(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) setLoginPromptOpen(false);
  }, [isAuthenticated]);

  // ─── Fetch menu from backend ──────────────────────────
  const fetchMenu = useCallback(async () => {
    try {
      const res = await menuAPI.getAll();
      if (res.data && res.data.length > 0) {
        setMenu(res.data.map(mapBackendMenuItem));
      }
    } catch (err) {
      console.warn("[API] Failed to fetch menu, using cached data:", err);
      setMenu((currentMenu) => currentMenu.length > 0 ? currentMenu : INITIAL_RICH_MENU);
    }
  }, []);

  // ─── Fetch orders from backend ────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const res = await orderAPI.getAll();
      if (res.data) {
        setOrders(res.data.map(mapBackendOrder));
      }
    } catch (err) {
      console.warn("[API] Failed to fetch orders:", err);
    }
  }, []);

  // ─── Refresh signed-in profile (e.g. after a smart-card debit) ──
  const refreshProfile = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      if (!res.user) return;
      setCurrentUser((prev) => ({
        ...prev,
        id: res.user.id || res.user._id || prev.id,
        name: res.user.name || prev.name,
        email: res.user.email || prev.email,
        smartCardBalance:
          typeof res.user.smart_card_balance === "number"
            ? res.user.smart_card_balance
            : prev.smartCardBalance,
      }));
    } catch (err) {
      console.warn("[API] Failed to refresh profile:", err);
    }
  }, []);

  // ─── Top up the smart card (demo instant credit) ───────────
  const topUpSmartCard = useCallback(
    async (amount: number) => {
      try {
        const res = await authAPI.topUpSmartCard(amount);
        setCurrentUser((prev) => ({
          ...prev,
          smartCardBalance: res.data?.smart_card_balance ?? prev.smartCardBalance,
        }));
        showToast(res.message || `Rs. ${amount.toFixed(2)} added to your smart card.`);
        return true;
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Could not top up the smart card."
        );
        return false;
      }
    },
    [showToast]
  );

  // ─── Fetch pickup slots from backend ──────────────────
  const fetchSlots = useCallback(async () => {
    try {
      const res = await orderAPI.getPickupSlots();
      if (res.data) {
        const mapped = res.data.map(mapBackendSlot);
        setSlots(mapped);
        if (mapped.length > 0 && !selectedSlotId) {
          const firstAvailable = mapped.find((s) => s.isAvailable);
          if (firstAvailable) setSelectedSlotId(firstAvailable.id);
        }
      }
    } catch (err) {
      console.warn("[API] Failed to fetch slots:", err);
    }
  }, [selectedSlotId]);

  // Keep a stable reference so real-time listeners never force socket reconnects
  const fetchSlotsRef = useRef(fetchSlots);
  useEffect(() => {
    fetchSlotsRef.current = fetchSlots;
  }, [fetchSlots]);
  const socketResyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Initial Menu Fetch on mount ──────────────────────
  useEffect(() => {
    fetchMenu();
    fetchSlots();
  }, [fetchMenu, fetchSlots]);

  // ─── Auto-login on mount if token exists ──────────────
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getToken();
        if (token) {
          try {
            const res = await authAPI.getMe();
            if (res.user) {
              const fRole = backendRoleToFrontendRole(res.user.role);
              setCurrentUser({
                id: res.user.id || res.user._id,
                name: res.user.name,
                email: res.user.email,
                role: fRole,
                smartCardBalance: fRole === "customer" ? Number(res.user.smart_card_balance ?? 0) : undefined,
                studentId: fRole === "customer" ? "MUET - 24CS031" : undefined,
              });
              setRoleState(fRole);
              setIsAuthenticated(true);
              return;
            }
          } catch (err) {
            console.warn("[API] Token validation failed:", err);
            setToken(null);
          }
        }
        // Default to guest customer (unauthenticated)
        setIsAuthenticated(false);
        setCurrentUser({
          id: "",
          name: "Guest Customer",
          email: "",
          role: "customer",
        });
      } finally {
        setIsAuthReady(true);
      }
    };

    try {
      const saved = localStorage.getItem("canteen_customer_preferences");
      if (saved) {
        setPreferences((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {}

    checkAuth();
  }, []);

  // ─── Fetch orders when authenticated ─────────────────
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      authAPI.getPreferences()
        .then((res) => setPreferences((prev) => ({ ...prev, ...res.data })))
        .catch((err) => console.warn("[API] Failed to fetch preferences:", err));
    }
  }, [isAuthenticated, fetchOrders]);

  // Listen for order notifications sent by the backend in real time.
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
      transports: ["websocket"],
    });
    socket.emit("join_user_room", currentUser.id);
    if (role === "kitchen" || role === "manager" || role === "admin") {
      socket.emit("join_kitchen_room");
    }

    // Debounced resync: status/queue/slot changes from any client refresh the
    // student order list, staff queue and pickup-slot availability.
    const scheduleResync = () => {
      if (socketResyncTimer.current) clearTimeout(socketResyncTimer.current);
      socketResyncTimer.current = setTimeout(() => {
        void fetchOrders();
        void fetchSlotsRef.current();
      }, 400);
    };

    socket.on("notification", (notification: { type: string; title: string; message: string }) => {
      if (notification.type === "ORDER_READY" && !preferences.notifyOnReady) return;
      if (notification.type === "ORDER_DELAYED" && !preferences.notifyOnDelay) return;
      showToast(`${notification.title}: ${notification.message}`);
      void fetchOrders();
    });

    socket.on("queue_updated", scheduleResync);
    socket.on("order_status_updated", scheduleResync);
    socket.on("order_created", scheduleResync);
    socket.on("pickup_slots_updated", scheduleResync);

    // Phase 3: Catch pickup_time_changed event and trigger toast alert
    socket.on("pickup_time_changed", (data: { orderId?: string; order_id?: string; pickup_slot?: string; pickup_time?: string; message?: string }) => {
      showToast(data.message || "Your scheduled pickup time has been updated.");
      if (data.orderId || data.order_id) {
        setOrders((prev) =>
          prev.map((ord) => {
            if (ord.id === data.orderId || ord.id === data.order_id) {
              return {
                ...ord,
                pickupSlot: data.pickup_slot || ord.pickupSlot,
              };
            }
            return ord;
          })
        );
      }
      fetchOrders();
    });

    socket.on("payment_status_updated", (data: { orderId: string; paymentStatus: string }) => {
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === data.orderId
            ? { ...ord, paymentStatus: data.paymentStatus as any }
            : ord
        )
      );
      showToast(`💳 Payment status updated: ${data.paymentStatus}`);
    });

    return () => {
      if (socketResyncTimer.current) clearTimeout(socketResyncTimer.current);
      socket.disconnect();
    };
  }, [isAuthenticated, currentUser.id, role, preferences.notifyOnReady, preferences.notifyOnDelay, showToast, fetchOrders]);

  // ─── Role Switch (login as different role) ────────────
  const setRole = useCallback(
    async (newRole: UserRole) => {
      const creds = DEFAULT_CREDENTIALS[newRole];
      const res = await authAPI.login(creds.email, creds.password);
      setToken(res.token);
      const fRole = backendRoleToFrontendRole(res.user.role);
      setCurrentUser({
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: fRole,
        smartCardBalance: fRole === "customer" ? Number(res.user.smart_card_balance ?? 0) : undefined,
        studentId: fRole === "customer" ? "MUET - 24CS031" : undefined,
      });
      setRoleState(fRole);
      setIsAuthenticated(true);
      showToast(`Switched to ${newRole.toUpperCase()} (${res.user.name})`);
      // Re-fetch data for new role
      fetchMenu();
      fetchOrders();
    },
    [showToast, fetchMenu, fetchOrders]
  );

  const login = useCallback(
    async (
      newRole: UserRole,
      credentials?: { email: string; password: string }
    ): Promise<LoginResponse> => {
    const creds = credentials ?? DEFAULT_CREDENTIALS[newRole];
    const res = await authAPI.login(creds.email, creds.password);
    const fRole = backendRoleToFrontendRole(res.user.role);

    if (fRole !== newRole) {
      setToken(null);
      throw new Error(
        `This account is registered as ${fRole.toUpperCase()}. Please select the ${fRole} role to continue.`
      );
    }

    setToken(res.token);
    setCurrentUser({
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: fRole,
        smartCardBalance: fRole === "customer" ? Number(res.user.smart_card_balance ?? 0) : undefined,
        studentId: fRole === "customer" ? "MUET - 24CS031" : undefined,
      });
      setRoleState(fRole);
      setIsAuthenticated(true);
      showToast(`Logged in as ${res.user.name} (${fRole.toUpperCase()})`);
      fetchMenu();
      fetchOrders();
      fetchSlots();
      return res;
    },
    [showToast, fetchMenu, fetchOrders, fetchSlots]
  );

  const logout = useCallback(() => {
    setToken(null);
    setIsAuthenticated(false);
    setCurrentUser({
      id: "",
      name: "Guest Customer",
      email: "",
      role: "customer",
    });
    setRoleState("customer");
    setCart([]);
    setOrders([]);
    setToastMessage("Logged out of Smart Canteen session");
    setTimeout(() => setToastMessage(null), 4000);
    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
  }, []);

  // ─── Menu CRUD (connected to backend) ─────────────────
  const saveMenuItem = useCallback(
    async (itemData: Partial<MenuItem> & { id?: string }) => {
      try {
        if (itemData.id) {
          // Edit existing
          await menuAPI.update(itemData.id, {
            item_name: itemData.name,
            category: itemData.category,
            price: itemData.price,
            available_quantity: itemData.availableQuantity,
            preparation_time: itemData.preparationTime,
            status: itemData.status || "Available",
            image: itemData.image,
          });
          showToast(`Updated menu item "${itemData.name}"`);
        } else {
          // Create new
          await menuAPI.create({
            item_name: itemData.name || "New Food Item",
            category: itemData.category || "Meals",
            price: itemData.price || 400,
            available_quantity: itemData.availableQuantity ?? 15,
            preparation_time: itemData.preparationTime ?? 8,
            status: "Available",
            image: itemData.image,
          });
          showToast(`Added new item "${itemData.name}" to canteen menu!`);
        }
        fetchMenu(); // Refresh from backend
      } catch (err: any) {
        console.warn("[API] Save menu item failed:", err);
        // Fallback: update local state
        if (itemData.id) {
          setMenu((prev) =>
            prev.map((m) => (m.id === itemData.id ? ({ ...m, ...itemData } as MenuItem) : m))
          );
          showToast(`Updated menu item "${itemData.name}" (local)`);
        } else {
          const newItem: MenuItem = {
            id: `item-${Date.now()}`,
            name: itemData.name || "New Food Item",
            category: itemData.category || "Meals",
            price: itemData.price || 4.0,
            image: itemData.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
            availableQuantity: itemData.availableQuantity ?? 15,
            preparationTime: itemData.preparationTime ?? 8,
            status: (itemData.availableQuantity ?? 15) > 0 ? "Available" : "Sold Out",
            description: itemData.description || "Fresh cafeteria meal prepared daily.",
            isVegetarian: itemData.isVegetarian ?? false,
            isFastPrep: (itemData.preparationTime ?? 8) <= 5,
            underFive: (itemData.price || 4.0) < 5,
            isPopular: false,
          };
          setMenu((prev) => [newItem, ...prev]);
          showToast(`Added new item "${newItem.name}" (local)`);
        }
      }
    },
    [showToast, fetchMenu]
  );

  const deleteMenuItem = useCallback(
    async (itemId: string) => {
      try {
        await menuAPI.delete(itemId);
        showToast("Deleted item from canteen menu.");
        fetchMenu();
      } catch (err) {
        console.warn("[API] Delete menu item failed:", err);
        setMenu((prev) => prev.filter((m) => m.id !== itemId));
        showToast("Deleted item from canteen menu (local).");
      }
    },
    [showToast, fetchMenu]
  );

  // ─── Cart operations (local only — cart is client-side) ─
  const addToCart = useCallback(
    (item: MenuItem) => {
      if (item.status === "Sold Out" || item.availableQuantity <= 0) {
        showToast(`${item.name} is currently Sold Out!`);
        return;
      }
      setCart((prev) => {
        const existing = prev.find((ci) => ci.menuItem.id === item.id);
        if (existing) {
          return prev.map((ci) =>
            ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
          );
        }
        return [...prev, { menuItem: item, quantity: 1, specialInstruction: "" }];
      });
      showToast(`Added ${item.name} to pre-order basket!`);
    },
    [showToast]
  );

  const updateCartQty = useCallback((itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => {
          if (ci.menuItem.id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[]
    );
  }, []);

  const updateCartInstruction = useCallback((itemId: string, note: string) => {
    setCart((prev) =>
      prev.map((ci) =>
        ci.menuItem.id === itemId ? { ...ci, specialInstruction: note } : ci
      )
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ─── Place Pre-Order (connected to backend) ───────────
  const placeOrder = useCallback(
    (slotId: string, paymentMethod: string = "smart_card"): Order | null => {
      if (!isAuthenticated) {
        showToast("🔒 Only logged in users can place pre-orders! Please log in first.");
        return null;
      }
      if (cart.length === 0) return null;
      const targetSlot = slots.find((s) => s.id === slotId) || slots[0];

      const requestedQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
      if (requestedQuantity > 10 || cart.some((item) => item.quantity > 20)) {
        showToast("Please keep your order within the 10-item limit.");
        return null;
      }

      if (targetSlot && (!targetSlot.isAvailable || targetSlot.currentOrders >= targetSlot.maxCapacity)) {
        showToast("Selected pickup slot is full! Please choose another slot.");
        return null;
      }

      // Build order for backend
      const orderItems = cart.map((ci) => {
        const currentMenuItem = menu.find(
          (item) => item.id === ci.menuItem.id || item.name === ci.menuItem.name
        );
        return {
          item_id: currentMenuItem?.id || ci.menuItem.id,
          quantity: ci.quantity,
          special_instruction: ci.specialInstruction || "",
        };
      });

      if (orderItems.some((item) => !item.item_id)) {
        showToast("One cart item is no longer available. Please refresh the menu and try again.");
        return null;
      }

      const computedPaymentStatus = paymentMethod === "cash_on_counter" ? "Pending" : "Paid";

      // Create a local optimistic order immediately for UX
      const tokenNum = `C-0${24 + orders.length}`;
      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        tokenNumber: tokenNum,
        customerId: currentUser.id,
        customerName: currentUser.name,
        items: cart.map((ci, idx) => ({
          id: `oi-${Date.now()}-${idx}`,
          menuItemId: ci.menuItem.id,
          name: ci.menuItem.name,
          price: ci.menuItem.price,
          quantity: ci.quantity,
          specialInstruction: ci.specialInstruction,
          image: ci.menuItem.image,
        })),
        totalAmount: cartTotal,
        orderTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        pickupSlot: targetSlot?.timeSlot || "",
        estimatedReadyTime: "~10 min",
        prepProgress: 15,
        status: "Placed",
        paymentStatus: computedPaymentStatus as any,
        paymentMethod: paymentMethod,
        pickupCounter: targetSlot?.stationName || "Counter Station B",
      };

      // Add optimistically
      setOrders((prev) => [newOrder, ...prev]);
      showToast(`Pre-Order Confirmed (${computedPaymentStatus})! Token #${tokenNum} issued.`);

      // Fire and forget: send to backend
      orderAPI
        .create({
          items: orderItems,
          pickup_slot: targetSlot?.timeSlot || "",
          payment_method: paymentMethod,
          idempotency_key: `idem-${Date.now()}`,
        })
        .then((res) => {
          if (res.data) {
            const backendOrder = mapBackendOrder(res.data);
            // Replace optimistic order with backend order
            setOrders((prev) =>
              prev.map((o) => (o.id === newOrder.id ? backendOrder : o))
            );
            showToast(`✅ Token #${res.data.token_number} confirmed by server!`);
          }
          clearCart();
          // Refresh menu stock, slot capacity and the smart-card balance
          fetchMenu();
          fetchSlots();
          refreshProfile();
        })
        .catch((err) => {
          console.warn("[API] Backend order creation failed:", err);
          setOrders((prev) => prev.filter((order) => order.id !== newOrder.id));
          showToast(`⚠️ Order was not placed: ${err instanceof Error ? err.message : "Please try again."}`);
        });

      return newOrder;
    },
    [cart, menu, slots, orders.length, currentUser, cartTotal, showToast, clearCart, fetchMenu, fetchSlots, refreshProfile]
  );

  // ─── Update Order Status (connected to backend) ───────
  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus, options?: { skipBackend?: boolean }) => {
      // Optimistic local update
      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id === orderId) {
            let progress = ord.prepProgress;
            if (newStatus === "Accepted") progress = 35;
            if (newStatus === "Preparing") progress = 65;
            if (newStatus === "Ready") progress = 100;
            if (newStatus === "Collected" || newStatus === "Completed") progress = 100;
            return { ...ord, status: newStatus, prepProgress: progress };
          }
          return ord;
        })
      );
      showToast(`Order status updated to "${newStatus}"`);

      // Backend already updated (e.g. via collection confirm endpoint) — just resync
      if (options?.skipBackend) {
        fetchOrders();
        return;
      }

      // Send to backend
      try {
        if (newStatus === "Cancelled") {
          await orderAPI.cancel(orderId, "Cancelled by user");
        } else {
          await queueAPI.updateStatus(orderId, newStatus);
        }
        fetchOrders();
      } catch (err) {
        console.warn("[API] Status update failed on backend:", err);
      }
    },
    [showToast, fetchOrders]
  );

  // ─── Reorder Past Order (Phase 1: Customer Reordering) ─────────
  const reorderPastOrder = useCallback(
    async (order: Order): Promise<{ success: boolean; outOfStockItems: string[] }> => {
      try {
        const res = await orderAPI.reorder(order.id);
        if (res && res.data) {
          const { items, out_of_stock_items } = res.data;

          if (items.length === 0) {
            showToast("⚠️ All items from this past order are currently out of stock!");
            return {
              success: false,
              outOfStockItems: out_of_stock_items.map((i) => i.item_name),
            };
          }

          const newCartItems: CartItem[] = items.map((it) => {
            const existingMenu = menu.find((m) => m.id === it.item_id || m.name === it.item_name);
            const menuItem: MenuItem = existingMenu || {
              id: it.item_id,
              name: it.item_name,
              category: it.category || "Meals",
              price: it.price,
              image:
                it.image ||
                "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
              availableQuantity: it.available_quantity,
              preparationTime: 5,
              status: "Available",
            };

            return {
              menuItem: { ...menuItem, price: it.price },
              quantity: it.quantity,
              specialInstruction: it.special_instruction || "",
            };
          });

          setCart(newCartItems);

          if (out_of_stock_items.length > 0) {
            const names = out_of_stock_items.map((i) => i.item_name).join(", ");
            showToast(`⚠️ Out of stock items excluded: ${names}`);
          } else {
            showToast(`🛒 Reorder added to cart! Proceeding to checkout.`);
          }

          return {
            success: true,
            outOfStockItems: out_of_stock_items.map((i) => i.item_name),
          };
        }
      } catch (err: any) {
        console.warn("[API] orderAPI.reorder failed, using client fallback:", err);
      }

      // Fallback client-side matching
      const validCartItems: CartItem[] = [];
      const outOfStockNames: string[] = [];

      for (const item of order.items) {
        const menuItem = menu.find((m) => m.id === item.menuItemId || m.name === item.name);
        if (!menuItem || menuItem.status === "Sold Out" || menuItem.availableQuantity <= 0) {
          outOfStockNames.push(item.name);
        } else {
          validCartItems.push({
            menuItem,
            quantity: Math.min(item.quantity, menuItem.availableQuantity),
            specialInstruction: item.specialInstruction || "",
          });
        }
      }

      if (validCartItems.length === 0) {
        showToast("⚠️ All items in this past order are currently out of stock!");
        return { success: false, outOfStockItems: outOfStockNames };
      }

      setCart(validCartItems);

      if (outOfStockNames.length > 0) {
        showToast(`⚠️ Out of stock items excluded: ${outOfStockNames.join(", ")}`);
      } else {
        showToast(`🛒 Reorder added to cart! Proceeding to checkout.`);
      }

      return { success: true, outOfStockItems: outOfStockNames };
    },
    [menu, showToast]
  );

  const activeOrder =
    orders.find((o) =>
      ["Placed", "Accepted", "Preparing", "Ready", "Delayed"].includes(o.status)
    ) || null;

  const updatePreferences = useCallback(
    async (newPrefs: Partial<CustomerPreferences>) => {
      setPreferences((prev) => {
        const updated = { ...prev, ...newPrefs };
        try {
          localStorage.setItem("canteen_customer_preferences", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      const token = getToken();
      if (!token) {
        showToast("Preferences saved.");
        return;
      }

      try {
        const res = await authAPI.updatePreferences(newPrefs);
        if (res && res.data) {
          setPreferences((prev) => ({ ...prev, ...res.data }));
        }
        showToast("Preferences saved.");
      } catch (err) {
        console.warn("[API] Server preferences sync note:", err);
        showToast("Preferences saved.");
      }
    },
    [showToast]
  );

  // ─── Toggle item availability (connected to backend) ──
  const toggleItemStatus = useCallback(
    async (itemId: string) => {
      const item = menu.find((m) => m.id === itemId);
      if (!item) return;
      const nextStatus: ItemStatus = item.status === "Available" ? "Sold Out" : "Available";
      const nextQty = nextStatus === "Sold Out" ? 0 : 15;

      // Optimistic
      setMenu((prev) =>
        prev.map((m) =>
          m.id === itemId ? { ...m, status: nextStatus, availableQuantity: nextQty } : m
        )
      );

      try {
        await menuAPI.updateStock(itemId, nextQty, nextStatus);
      } catch (err) {
        console.warn("[API] Toggle item status failed:", err);
      }
    },
    [menu]
  );

  const updateItemStock = useCallback(
    async (itemId: string, newStock: number) => {
      setMenu((prev) =>
        prev.map((m) =>
          m.id === itemId
            ? {
                ...m,
                availableQuantity: newStock,
                status: newStock === 0 ? "Sold Out" : newStock <= 3 ? "Limited" : "Available",
              }
            : m
        )
      );

      try {
        await menuAPI.updateStock(itemId, newStock);
      } catch (err) {
        console.warn("[API] Update stock failed:", err);
      }
    },
    []
  );

  // ─── Stats (computed from orders) ─────────────────────
  const stats: CanteenStats = {
    totalOrdersToday: Math.max(orders.length, 186),
    activeOrders: orders.filter((o) =>
      ["Placed", "Accepted", "Preparing", "Ready"].includes(o.status)
    ).length,
    preparingOrders: orders.filter((o) => o.status === "Preparing").length,
    readyOrders: orders.filter((o) => o.status === "Ready").length,
    completedOrders: Math.max(
      orders.filter((o) => ["Collected", "Completed"].includes(o.status)).length,
      153
    ),
    cancelledOrders: Math.max(
      orders.filter((o) => o.status === "Cancelled").length,
      15
    ),
    totalSalesToday: Math.max(
      orders.reduce((s, o) => s + o.totalAmount, 0),
      894.5
    ),
    avgPrepTimeMinutes: 11,
    peakOrderingTime: "1:00 PM – 1:30 PM",
    popularItems: [
      { name: "Chicken Burger", count: 74 },
      { name: "French Fries", count: 58 },
      { name: "Cold Drink 500ml", count: 49 },
    ],
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        currentUser,
        login,
        logout,
        isAuthenticated,
        isAuthReady,
        loginPromptOpen,
        loginPromptMessage,
        promptLogin,
        dismissLoginPrompt,
        menu,
        saveMenuItem,
        deleteMenuItem,
        cart,
        addToCart,
        updateCartQty,
        updateCartInstruction,
        clearCart,
        cartTotal,
        cartCount,
        slots,
        refreshSlots: fetchSlots,
        refreshOrders: fetchOrders,
        refreshProfile,
        topUpSmartCard,
        selectedSlotId,
        setSelectedSlotId,
        orders,
        placeOrder,
        reorderPastOrder,
        updateOrderStatus,
        activeOrder,
        preferences,
        updatePreferences,
        aiInsights,
        stats,
        toggleItemStatus,
        updateItemStock,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
