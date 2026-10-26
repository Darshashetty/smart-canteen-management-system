/**
 * Unified In-Memory Reactive Store
 * Active when MongoDB is not connected, ensuring 100% full-stack functionality:
 * - Authentication (Customer, Staff, Manager, Admin)
 * - Atomic stock decrement & slot validation (Criteria A1, A2)
 * - Strict State Machine transitions (Criterion A3)
 * - Single-use token verification & collection (Criterion A4)
 * - Live queue management & AI analytics
 */

const bcrypt = require('bcryptjs');
const { ROLES, ACCOUNT_STATUS, ORDER_STATUS, MENU_ITEM_STATUS, DEFAULT_SETTINGS, SMART_CARD_DEFAULT_BALANCE } = require('../config/constants');
const { generateQRCodeDataURL } = require('../utils/qrCodeGenerator');

// Dynamically created records get valid 24-hex _ids (outside the seed range)
// so route-level ObjectId validation accepts them
let memoryIdCounter = 0x800;
const nextMemoryId = () =>
  '64f1a2b3c4d5e6f7a8b9c' +
  (0x800 + (memoryIdCounter++ % 0x800)).toString(16).padStart(3, '0');

// 1. Seed Users
const memoryUsers = [
  {
    _id: '64f1a2b3c4d5e6f7a8b9c101',
    name: 'Student Customer',
    email: 'customer@canteen.com',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: ROLES.CUSTOMER,
    account_status: ACCOUNT_STATUS.ACTIVE,
    phone: '+923001234567',
    smart_card_balance: SMART_CARD_DEFAULT_BALANCE,
    createdAt: new Date()
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c102',
    name: 'Kitchen Chef / Staff',
    email: 'staff@canteen.com',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: ROLES.STAFF,
    account_status: ACCOUNT_STATUS.ACTIVE,
    phone: '+923001234568',
    smart_card_balance: SMART_CARD_DEFAULT_BALANCE,
    createdAt: new Date()
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c103',
    name: 'Canteen Manager',
    email: 'manager@canteen.com',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: ROLES.MANAGER,
    account_status: ACCOUNT_STATUS.ACTIVE,
    phone: '+923001234569',
    smart_card_balance: SMART_CARD_DEFAULT_BALANCE,
    createdAt: new Date()
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c104',
    name: 'System Administrator',
    email: 'admin@canteen.com',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: ROLES.ADMIN,
    account_status: ACCOUNT_STATUS.ACTIVE,
    phone: '+923001234570',
    smart_card_balance: SMART_CARD_DEFAULT_BALANCE,
    createdAt: new Date()
  }
];

// Seed Categories
let memoryCategories = [
  { _id: 'cat_001', name: 'Burgers', description: 'Freshly grilled gourmet burgers', icon: 'lunch_dining', image: '', is_active: true, createdAt: new Date() },
  { _id: 'cat_002', name: 'Meals', description: 'Wholesome rice, curries and complete meal platters', icon: 'dinner_dining', image: '', is_active: true, createdAt: new Date() },
  { _id: 'cat_003', name: 'Beverages', description: 'Cold drinks, fresh juices and hot beverages', icon: 'local_cafe', image: '', is_active: true, createdAt: new Date() },
  { _id: 'cat_004', name: 'Snacks', description: 'Crispy sides, fries and finger foods', icon: 'fastfood', image: '', is_active: true, createdAt: new Date() },
  { _id: 'cat_005', name: 'Desserts', description: 'Sweet cakes, pastries and treats', icon: 'icecream', image: '', is_active: true, createdAt: new Date() },
];

// Seed Canteens
let memoryCanteens = [
  { _id: 'cant_001', name: 'Central Campus Hub', location: 'Main Academic Building Ground Floor', opening_time: '12:00', closing_time: '21:00', is_active: true, contact_number: '+92 300 1112233', createdAt: new Date() },
  { _id: 'cant_002', name: 'Engineering Block Express', location: 'Block B, 1st Floor Cafeteria', opening_time: '08:30', closing_time: '18:30', is_active: true, contact_number: '+92 300 4445566', createdAt: new Date() },
  { _id: 'cant_003', name: 'Hostel Night Canteen', location: 'Residential Quad Building C', opening_time: '18:00', closing_time: '02:00', is_active: true, contact_number: '+92 300 7778899', createdAt: new Date() },
];

// 2. Seed Rich Menu Items
let memoryMenuItems = [
  {
    _id: '64f1a2b3c4d5e6f7a8b9c001',
    item_id: 'ITEM-1001',
    item_name: 'Chicken Burger',
    category: 'Fast Food',
    price: 450,
    available_quantity: 12,
    preparation_time: 8,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
    total_orders_count: 142
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c002',
    item_id: 'ITEM-1002',
    item_name: 'French Fries',
    category: 'Fast Food',
    price: 200,
    available_quantity: 25,
    preparation_time: 5,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600',
    total_orders_count: 215
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c003',
    item_id: 'ITEM-1003',
    item_name: 'Cold Drink 500ml',
    category: 'Beverages',
    price: 100,
    available_quantity: 40,
    preparation_time: 2,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1514116349449-55427895b2c4?w=600',
    total_orders_count: 310
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c004',
    item_id: 'ITEM-1004',
    item_name: 'Club Sandwich',
    category: 'Fast Food',
    price: 380,
    available_quantity: 15,
    preparation_time: 7,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600',
    total_orders_count: 98
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c005',
    item_id: 'ITEM-1005',
    item_name: 'Chicken Shawarma Wrap',
    category: 'Fast Food',
    price: 320,
    available_quantity: 4,
    preparation_time: 6,
    status: MENU_ITEM_STATUS.LIMITED,
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600',
    total_orders_count: 165
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c006',
    item_id: 'ITEM-1006',
    item_name: 'Fresh Garden Salad',
    category: 'Meals',
    price: 250,
    available_quantity: 8,
    preparation_time: 4,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
    total_orders_count: 54
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c007',
    item_id: 'ITEM-1007',
    item_name: 'Hot Cappuccino',
    category: 'Beverages',
    price: 180,
    available_quantity: 30,
    preparation_time: 3,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600',
    total_orders_count: 180
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c008',
    item_id: 'ITEM-1008',
    item_name: 'Artisanal Veggie Buddha Bowl',
    category: 'Meals',
    price: 420,
    available_quantity: 14,
    preparation_time: 9,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
    total_orders_count: 64
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c009',
    item_id: 'ITEM-1009',
    item_name: 'Classic Iced Matcha Latte',
    category: 'Beverages',
    price: 260,
    available_quantity: 30,
    preparation_time: 4,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600',
    total_orders_count: 88
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c00a',
    item_id: 'ITEM-1010',
    item_name: 'Spicy Paneer Tikka Wrap',
    category: 'Meals',
    price: 340,
    available_quantity: 16,
    preparation_time: 8,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600',
    total_orders_count: 76
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c00b',
    item_id: 'ITEM-1011',
    item_name: 'Double Chocolate Fudge Brownie',
    category: 'Desserts',
    price: 220,
    available_quantity: 22,
    preparation_time: 3,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Brownie_dessert_%2843110731564%29.jpg',
    total_orders_count: 120
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c00c',
    item_id: 'ITEM-1012',
    item_name: 'Smokey BBQ Beef Burger',
    category: 'Fast Food',
    price: 520,
    available_quantity: 18,
    preparation_time: 10,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600',
    total_orders_count: 110
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c00d',
    item_id: 'ITEM-1013',
    item_name: 'Crispy Chicken Zinger Roll',
    category: 'Fast Food',
    price: 360,
    available_quantity: 20,
    preparation_time: 6,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600',
    total_orders_count: 95
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c00e',
    item_id: 'ITEM-1014',
    item_name: 'Mango Passion Fruit Cooler',
    category: 'Beverages',
    price: 190,
    available_quantity: 35,
    preparation_time: 3,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600',
    total_orders_count: 70
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c00f',
    item_id: 'ITEM-1015',
    item_name: 'Cheesy Garlic Bread Sticks',
    category: 'Snacks',
    price: 240,
    available_quantity: 28,
    preparation_time: 6,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600',
    total_orders_count: 82
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c010',
    item_id: 'ITEM-1016',
    item_name: 'Velvety Red Velvet Pastry',
    category: 'Desserts',
    price: 250,
    available_quantity: 15,
    preparation_time: 2,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Red_velvet_cake_slice.jpg',
    total_orders_count: 66
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c011',
    item_id: 'ITEM-2001',
    item_name: 'Classic Margherita Pizza',
    category: 'Fast Food',
    price: 650,
    available_quantity: 18,
    preparation_time: 12,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600',
    total_orders_count: 140
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c012',
    item_id: 'ITEM-2002',
    item_name: 'Chicken Alfredo Pasta',
    category: 'Meals',
    price: 720,
    available_quantity: 16,
    preparation_time: 15,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600',
    total_orders_count: 92
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c013',
    item_id: 'ITEM-2003',
    item_name: 'Grilled Chicken Steak',
    category: 'Meals',
    price: 950,
    available_quantity: 12,
    preparation_time: 18,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600',
    total_orders_count: 58
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c014',
    item_id: 'ITEM-2004',
    item_name: 'Beef Lasagna',
    category: 'Meals',
    price: 780,
    available_quantity: 14,
    preparation_time: 14,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=600',
    total_orders_count: 61
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c015',
    item_id: 'ITEM-2005',
    item_name: 'Chicken Tikka Platter',
    category: 'Meals',
    price: 850,
    available_quantity: 15,
    preparation_time: 16,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600',
    total_orders_count: 74
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c016',
    item_id: 'ITEM-2006',
    item_name: 'Classic Caesar Salad',
    category: 'Meals',
    price: 480,
    available_quantity: 20,
    preparation_time: 7,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600',
    total_orders_count: 49
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c017',
    item_id: 'ITEM-2007',
    item_name: 'French Toast Breakfast',
    category: 'Breakfast',
    price: 420,
    available_quantity: 18,
    preparation_time: 8,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600',
    total_orders_count: 55
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c018',
    item_id: 'ITEM-2008',
    item_name: 'Omelette with Toast',
    category: 'Breakfast',
    price: 380,
    available_quantity: 20,
    preparation_time: 7,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600',
    total_orders_count: 47
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c019',
    item_id: 'ITEM-2009',
    item_name: 'Buttermilk Pancake Stack',
    category: 'Breakfast',
    price: 460,
    available_quantity: 15,
    preparation_time: 10,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600',
    total_orders_count: 52
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c01a',
    item_id: 'ITEM-2010',
    item_name: 'Chicken Nuggets',
    category: 'Snacks',
    price: 390,
    available_quantity: 24,
    preparation_time: 8,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1562967916-eb40622dbd92?w=600',
    total_orders_count: 118
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c01b',
    item_id: 'ITEM-2011',
    item_name: 'Chocolate Lava Cake',
    category: 'Desserts',
    price: 450,
    available_quantity: 16,
    preparation_time: 6,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476d?w=600',
    total_orders_count: 103
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c01c',
    item_id: 'ITEM-2012',
    item_name: 'Fresh Orange Juice',
    category: 'Beverages',
    price: 260,
    available_quantity: 30,
    preparation_time: 3,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600',
    total_orders_count: 97
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c01d',
    item_id: 'ITEM-2013',
    item_name: 'Mint Lemonade',
    category: 'Beverages',
    price: 280,
    available_quantity: 28,
    preparation_time: 4,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1523677011781-c91d1ebe2f0a?w=600',
    total_orders_count: 63
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c01e',
    item_id: 'ITEM-2014',
    item_name: 'Paneer Butter Masala',
    category: 'Meals',
    price: 680,
    available_quantity: 16,
    preparation_time: 14,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Paneer_butter_masala_2.jpg',
    total_orders_count: 85
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c01f',
    item_id: 'ITEM-2015',
    item_name: 'Dal Makhani',
    category: 'Meals',
    price: 520,
    available_quantity: 20,
    preparation_time: 12,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600',
    total_orders_count: 78
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c020',
    item_id: 'ITEM-2016',
    item_name: 'Chicken Seekh Kebab',
    category: 'Meals',
    price: 760,
    available_quantity: 14,
    preparation_time: 15,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600',
    total_orders_count: 69
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c021',
    item_id: 'ITEM-2017',
    item_name: 'Fish and Chips',
    category: 'Fast Food',
    price: 690,
    available_quantity: 14,
    preparation_time: 15,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1579208030886-b937da0925dc?w=600',
    total_orders_count: 57
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c022',
    item_id: 'ITEM-2018',
    item_name: 'Chicken Club Sandwich',
    category: 'Fast Food',
    price: 560,
    available_quantity: 18,
    preparation_time: 9,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600',
    total_orders_count: 87
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c023',
    item_id: 'ITEM-2019',
    item_name: 'Loaded Nachos',
    category: 'Snacks',
    price: 420,
    available_quantity: 22,
    preparation_time: 7,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600',
    total_orders_count: 91
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c024',
    item_id: 'ITEM-2020',
    item_name: 'Crispy Onion Rings',
    category: 'Snacks',
    price: 320,
    available_quantity: 25,
    preparation_time: 6,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600',
    total_orders_count: 73
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c025',
    item_id: 'ITEM-2021',
    item_name: 'Chicken Spring Rolls',
    category: 'Snacks',
    price: 380,
    available_quantity: 20,
    preparation_time: 8,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600',
    total_orders_count: 59
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c026',
    item_id: 'ITEM-2022',
    item_name: 'Tandoori Momos',
    category: 'Snacks',
    price: 450,
    available_quantity: 18,
    preparation_time: 10,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1626776876729-bab4369a5a5a?w=600',
    total_orders_count: 84
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c027',
    item_id: 'ITEM-2023',
    item_name: 'Strawberry Milkshake',
    category: 'Beverages',
    price: 390,
    available_quantity: 24,
    preparation_time: 5,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600',
    total_orders_count: 80
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c028',
    item_id: 'ITEM-2024',
    item_name: 'Iced Americano',
    category: 'Beverages',
    price: 300,
    available_quantity: 30,
    preparation_time: 3,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600',
    total_orders_count: 68
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c029',
    item_id: 'ITEM-2025',
    item_name: 'Classic Hot Chocolate',
    category: 'Beverages',
    price: 340,
    available_quantity: 22,
    preparation_time: 5,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600',
    total_orders_count: 62
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c02a',
    item_id: 'ITEM-2026',
    item_name: 'Blueberry Cheesecake',
    category: 'Desserts',
    price: 520,
    available_quantity: 12,
    preparation_time: 4,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600',
    total_orders_count: 77
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c02b',
    item_id: 'ITEM-2027',
    item_name: 'Gulab Jamun Sundae',
    category: 'Desserts',
    price: 480,
    available_quantity: 14,
    preparation_time: 5,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600',
    total_orders_count: 71
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c02c',
    item_id: 'ITEM-2028',
    item_name: 'Fresh Fruit Trifle',
    category: 'Desserts',
    price: 440,
    available_quantity: 16,
    preparation_time: 5,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600',
    total_orders_count: 45
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c02d',
    item_id: 'ITEM-3001',
    item_name: 'Oreo Milkshake',
    category: 'Beverages',
    price: 180,
    available_quantity: 24,
    preparation_time: 5,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Oreo_milkshake_-_Creperie_Doux_Sourire_2025-05-03.jpg',
    total_orders_count: 96
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c02e',
    item_id: 'ITEM-3002',
    item_name: 'Badam Milk',
    category: 'Beverages',
    price: 120,
    available_quantity: 24,
    preparation_time: 5,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/BadamMilk.JPG',
    total_orders_count: 54
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c02f',
    item_id: 'ITEM-3003',
    item_name: 'Strawberry Frappe',
    category: 'Beverages',
    price: 180,
    available_quantity: 20,
    preparation_time: 6,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600',
    total_orders_count: 65
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c030',
    item_id: 'ITEM-3004',
    item_name: 'Peach Iced Tea',
    category: 'Beverages',
    price: 100,
    available_quantity: 28,
    preparation_time: 4,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600',
    total_orders_count: 48
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c031',
    item_id: 'ITEM-3005',
    item_name: 'Puri Bhaji',
    category: 'Breakfast',
    price: 120,
    available_quantity: 20,
    preparation_time: 10,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Puri_Bhajji_in_Mumbai_Restaurant.JPG',
    total_orders_count: 43
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c032',
    item_id: 'ITEM-3006',
    item_name: 'Veg Sandwich',
    category: 'Breakfast',
    price: 100,
    available_quantity: 20,
    preparation_time: 7,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600',
    total_orders_count: 56
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c033',
    item_id: 'ITEM-3007',
    item_name: 'Pongal',
    category: 'Breakfast',
    price: 100,
    available_quantity: 18,
    preparation_time: 10,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Pongal_-_1.jpg',
    total_orders_count: 38
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c034',
    item_id: 'ITEM-3008',
    item_name: 'Idli Vada Combo',
    category: 'Breakfast',
    price: 120,
    available_quantity: 18,
    preparation_time: 9,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Idli_Sambar-Noida-UP-SP004.jpg',
    total_orders_count: 60
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c035',
    item_id: 'ITEM-3009',
    item_name: 'Chocolate Brownie',
    category: 'Desserts',
    price: 100,
    available_quantity: 20,
    preparation_time: 4,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Brownie_dessert_%2843110731564%29.jpg',
    total_orders_count: 105
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c036',
    item_id: 'ITEM-3010',
    item_name: 'Rasmalai',
    category: 'Desserts',
    price: 140,
    available_quantity: 16,
    preparation_time: 5,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Rasmalai_3.jpg',
    total_orders_count: 67
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c037',
    item_id: 'ITEM-3011',
    item_name: 'Carrot Halwa',
    category: 'Desserts',
    price: 120,
    available_quantity: 18,
    preparation_time: 6,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Delicious_Gajar_Ka_Halwa.jpg',
    total_orders_count: 41
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c038',
    item_id: 'ITEM-3012',
    item_name: 'Ice Cream Sundae',
    category: 'Desserts',
    price: 150,
    available_quantity: 18,
    preparation_time: 5,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600',
    total_orders_count: 89
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c039',
    item_id: 'ITEM-3013',
    item_name: 'Paneer Burger',
    category: 'Fast Food',
    price: 220,
    available_quantity: 18,
    preparation_time: 10,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
    total_orders_count: 83
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c03a',
    item_id: 'ITEM-3014',
    item_name: 'Veg Cheese Pizza',
    category: 'Fast Food',
    price: 350,
    available_quantity: 16,
    preparation_time: 14,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
    total_orders_count: 112
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c03b',
    item_id: 'ITEM-3015',
    item_name: 'Paneer Wrap',
    category: 'Fast Food',
    price: 180,
    available_quantity: 20,
    preparation_time: 8,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600',
    total_orders_count: 75
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c03c',
    item_id: 'ITEM-3016',
    item_name: 'Veg Momos',
    category: 'Fast Food',
    price: 180,
    available_quantity: 22,
    preparation_time: 9,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/4/40/Veg_Momos_2.jpg',
    total_orders_count: 108
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c03d',
    item_id: 'ITEM-3017',
    item_name: 'Chilli Cheese Toast',
    category: 'Fast Food',
    price: 150,
    available_quantity: 30,
    preparation_time: 5,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600',
    total_orders_count: 94
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c03e',
    item_id: 'ITEM-3018',
    item_name: 'Tandoori Pizza',
    category: 'Fast Food',
    price: 400,
    available_quantity: 14,
    preparation_time: 15,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600',
    total_orders_count: 99
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c03f',
    item_id: 'ITEM-3019',
    item_name: 'Aloo Tikki Burger',
    category: 'Fast Food',
    price: 200,
    available_quantity: 22,
    preparation_time: 9,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600',
    total_orders_count: 86
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c040',
    item_id: 'ITEM-3020',
    item_name: 'Paneer Butter Masala with Rice',
    category: 'Meals',
    price: 280,
    available_quantity: 16,
    preparation_time: 15,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Paneer_butter_masala_2.jpg',
    total_orders_count: 72
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c041',
    item_id: 'ITEM-3021',
    item_name: 'Veg Fried Rice',
    category: 'Meals',
    price: 180,
    available_quantity: 20,
    preparation_time: 10,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600',
    total_orders_count: 79
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c042',
    item_id: 'ITEM-3022',
    item_name: 'North Indian Thali',
    category: 'Meals',
    price: 350,
    available_quantity: 12,
    preparation_time: 18,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/8b/North_Indian_Vegetarian_Thali-MB51.jpg',
    total_orders_count: 66
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c043',
    item_id: 'ITEM-3023',
    item_name: 'Paneer Puff',
    category: 'Snacks',
    price: 100,
    available_quantity: 24,
    preparation_time: 6,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Pastelitos_de_hojaldre_con_puerro_y_tofu_-_Vegan_leek_and_tofu_puff_pastry_%285592619766%29.jpg',
    total_orders_count: 44
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c044',
    item_id: 'ITEM-3024',
    item_name: 'Veg Spring Roll',
    category: 'Snacks',
    price: 140,
    available_quantity: 24,
    preparation_time: 7,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600',
    total_orders_count: 53
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c045',
    item_id: 'ITEM-3025',
    item_name: 'Cheese Sandwich',
    category: 'Snacks',
    price: 120,
    available_quantity: 24,
    preparation_time: 6,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600',
    total_orders_count: 51
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c046',
    item_id: 'ITEM-3026',
    item_name: 'Masala Fries',
    category: 'Snacks',
    price: 100,
    available_quantity: 28,
    preparation_time: 5,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600',
    total_orders_count: 90
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c047',
    item_id: 'ITEM-3027',
    item_name: 'Bread Pakora',
    category: 'Snacks',
    price: 80,
    available_quantity: 24,
    preparation_time: 7,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Bread_Pakora_%28Stuffed_with_Mashed-Spicy-Potatoes%29.JPG',
    total_orders_count: 46
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c048',
    item_id: 'ITEM-3028',
    item_name: 'Aloo Chaat',
    category: 'Snacks',
    price: 100,
    available_quantity: 22,
    preparation_time: 6,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Aloo_Chaat.jpg',
    total_orders_count: 58
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c049',
    item_id: 'ITEM-4001',
    item_name: 'Masala Dosa',
    category: 'Breakfast',
    price: 320,
    available_quantity: 20,
    preparation_time: 12,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Masala_dosa_01.jpg',
    total_orders_count: 82
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c04a',
    item_id: 'ITEM-4002',
    item_name: 'Aloo Paratha',
    category: 'Breakfast',
    price: 300,
    available_quantity: 22,
    preparation_time: 10,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Aloo_Paratha_%2896238%29.jpg',
    total_orders_count: 88
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c04b',
    item_id: 'ITEM-4003',
    item_name: 'Samosa',
    category: 'Snacks',
    price: 180,
    available_quantity: 30,
    preparation_time: 5,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Samosa_with_sweet_chutney.jpg',
    total_orders_count: 116
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c04c',
    item_id: 'ITEM-4004',
    item_name: 'Veg Chowmein',
    category: 'Fast Food',
    price: 340,
    available_quantity: 24,
    preparation_time: 9,
    status: MENU_ITEM_STATUS.AVAILABLE,
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Veg_Chowmein_Indian_Style%21.jpg',
    total_orders_count: 101
  }
];

// 3. Seed Initial Queue Orders
let memoryOrders = [
  {
    _id: '64f1a2b3c4d5e6f7a8b9c201',
    order_id: 'ORD-20261001-1021',
    customer_id: '64f1a2b3c4d5e6f7a8b9c101',
    customer_name: 'Sarah Khan (Student)',
    token_number: 'C-021',
    qr_code: '',
    items: [
      { order_item_id: 'OI-101', item_id: 'ITEM-1001', item_name: 'Chicken Burger', quantity: 1, price: 450, special_instruction: 'Extra mayo' },
      { order_item_id: 'OI-102', item_id: 'ITEM-1003', item_name: 'Cold Drink 500ml', quantity: 1, price: 100 }
    ],
    total_amount: 550,
    order_time: new Date(Date.now() - 14 * 60000),
    pickup_slot: '13:00-13:15',
    pickup_time: new Date(Date.now() + 10 * 60000),
    estimated_ready_time: new Date(Date.now() + 5 * 60000),
    order_status: ORDER_STATUS.PREPARING,
    payment_status: 'paid',
    payment_method: 'cash_on_counter',
    priority_score: 185,
    is_delayed: false,
    history: [
      { from: null, to: ORDER_STATUS.PLACED, timestamp: new Date(Date.now() - 14 * 60000) },
      { from: ORDER_STATUS.PLACED, to: ORDER_STATUS.PREPARING, timestamp: new Date(Date.now() - 10 * 60000) }
    ]
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c202',
    order_id: 'ORD-20261001-1022',
    customer_id: '64f1a2b3c4d5e6f7a8b9c101',
    customer_name: 'Ali Raza (Employee)',
    token_number: 'C-022',
    qr_code: '',
    items: [
      { order_item_id: 'OI-103', item_id: 'ITEM-1004', item_name: 'Club Sandwich', quantity: 2, price: 380, special_instruction: 'Toasted well' }
    ],
    total_amount: 760,
    order_time: new Date(Date.now() - 18 * 60000),
    pickup_slot: '13:00-13:15',
    pickup_time: new Date(Date.now() + 5 * 60000),
    estimated_ready_time: new Date(Date.now() - 2 * 60000),
    order_status: ORDER_STATUS.DELAYED,
    payment_status: 'paid',
    payment_method: 'card',
    priority_score: 210,
    is_delayed: true,
    history: [
      { from: null, to: ORDER_STATUS.PLACED, timestamp: new Date(Date.now() - 18 * 60000) },
      { from: ORDER_STATUS.PLACED, to: ORDER_STATUS.PREPARING, timestamp: new Date(Date.now() - 15 * 60000) },
      { from: ORDER_STATUS.PREPARING, to: ORDER_STATUS.DELAYED, timestamp: new Date(Date.now() - 2 * 60000) }
    ]
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c203',
    order_id: 'ORD-20261001-1023',
    customer_id: '64f1a2b3c4d5e6f7a8b9c101',
    customer_name: 'Bilal Ahmed (Student)',
    token_number: 'C-023',
    qr_code: '',
    items: [
      { order_item_id: 'OI-104', item_id: 'ITEM-1001', item_name: 'Chicken Burger', quantity: 2, price: 450, special_instruction: 'No onions' },
      { order_item_id: 'OI-105', item_id: 'ITEM-1002', item_name: 'French Fries', quantity: 1, price: 200 }
    ],
    total_amount: 1100,
    order_time: new Date(Date.now() - 5 * 60000),
    pickup_slot: '13:15-13:30',
    pickup_time: new Date(Date.now() + 25 * 60000),
    estimated_ready_time: new Date(Date.now() + 15 * 60000),
    order_status: ORDER_STATUS.PLACED,
    payment_status: 'pending',
    payment_method: 'cash_on_counter',
    priority_score: 145,
    is_delayed: false,
    history: [
      { from: null, to: ORDER_STATUS.PLACED, timestamp: new Date(Date.now() - 5 * 60000) }
    ]
  }
];

let memoryLogs = [
  {
    _id: 'log_01',
    user_name: 'System',
    role: 'system',
    action: 'SYSTEM_BOOT',
    details: { message: 'Smart Canteen Service initialized' },
    created_at: new Date(Date.now() - 60 * 60000)
  },
  {
    _id: 'log_02',
    user_name: 'Kitchen Chef',
    role: 'staff',
    action: 'ORDER_PREPARING',
    details: { order_id: 'ORD-20261001-1021', token: 'C-021' },
    created_at: new Date(Date.now() - 10 * 60000)
  }
];

let tokenCounter = 23;
let memorySettings = { ...DEFAULT_SETTINGS };

// Pickup-slot capacity ledger: in-memory parity with the PickupSlotBooking
// collection so the no-database fallback still reserves/releases capacity
// correctly (key: `${YYYY-MM-DD}|${slot}` -> booked_count).
const memorySlotBookings = {};
const slotLedgerKey = (dateStr, slot) => `${dateStr}|${slot}`;

const RELEASABLE_STATUSES = [
  ORDER_STATUS.COLLECTED,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.REJECTED,
  ORDER_STATUS.NOT_COLLECTED
];

const ACTIVE_ORDER_STATUSES = [
  ORDER_STATUS.PLACED,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
  ORDER_STATUS.DELAYED
];

// Serializes order creation so concurrent requests cannot both pass the stock
// or slot-capacity checks before either one reserves resources. This mirrors
// the conditional/atomic updates used by the MongoDB path.
let orderCreateChain = Promise.resolve();
const withOrderCreateLock = (task) => {
  const run = orderCreateChain.then(task, task);
  orderCreateChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
};

// Synchronously generate initial QR codes for seed orders
(async () => {
  for (const ord of memoryOrders) {
    try {
      ord.qr_code = await generateQRCodeDataURL(ord.token_number, ord.order_id);
    } catch {}
  }
})();

const InMemoryStore = {
  // Users
  findUserByEmail: (email) => {
    return memoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },
  findUserById: (id) => {
    return memoryUsers.find((u) => u._id === String(id) || u._id === id);
  },
  getAllUsers: (filter = {}) => {
    let list = [...memoryUsers];
    if (filter.role) list = list.filter((u) => u.role === filter.role);
    if (filter.status) list = list.filter((u) => u.account_status === filter.status);
    return list.map((u) => {
      const { passwordHash, ...rest } = u;
      return rest;
    });
  },
  createUser: async ({ name, email, password, phone, role = ROLES.CUSTOMER }) => {
    const newUser = {
      _id: nextMemoryId(),
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      role,
      account_status: ACCOUNT_STATUS.ACTIVE,
      phone: phone || '',
      smart_card_balance: SMART_CARD_DEFAULT_BALANCE,
      createdAt: new Date()
    };
    memoryUsers.push(newUser);
    return newUser;
  },
  updateUser: (id, fields = {}) => {
    const user = InMemoryStore.findUserById(id);
    if (!user) return null;
    const allowed = ['role', 'account_status', 'smart_card_balance', 'phone', 'name'];
    for (const key of allowed) {
      if (fields[key] !== undefined) user[key] = fields[key];
    }
    return user;
  },
  comparePassword: async (providedPassword, user) => {
    return await bcrypt.compare(providedPassword, user.passwordHash);
  },

  // Menu Items
  getMenuItems: (filters = {}) => {
    let list = [...memoryMenuItems];
    if (filters.category && filters.category !== 'All') {
      list = list.filter((i) => i.category.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.search) {
      list = list.filter((i) => i.item_name.toLowerCase().includes(filters.search.toLowerCase()));
    }
    return list;
  },
  getMenuItemById: (id) => {
    return memoryMenuItems.find((i) => i._id === String(id) || i.item_id === String(id));
  },
  updateMenuItemStock: (id, qtyChange) => {
    const item = memoryMenuItems.find((i) => i._id === String(id) || i.item_id === String(id));
    if (!item) return null;
    item.available_quantity = Math.max(0, item.available_quantity + qtyChange);
    if (item.available_quantity === 0) item.status = MENU_ITEM_STATUS.SOLD_OUT;
    else if (item.available_quantity <= 5) item.status = MENU_ITEM_STATUS.LIMITED;
    else item.status = MENU_ITEM_STATUS.AVAILABLE;
    return item;
  },

  // Orders
  getOrders: (filter = {}) => {
    let list = [...memoryOrders];
    if (filter.customer_id) {
      list = list.filter((o) => String(o.customer_id) === String(filter.customer_id));
    }
    if (filter.order_status) {
      list = list.filter((o) => o.order_status === filter.order_status);
    }
    return list.sort((a, b) => new Date(b.order_time) - new Date(a.order_time));
  },
  getOrderById: (id) => {
    return memoryOrders.find((o) => o._id === String(id) || o.order_id === String(id));
  },
  getOrderByToken: (token) => {
    const norm = String(token).trim().toUpperCase();
    const matches = memoryOrders.filter((o) => o.token_number.toUpperCase() === norm);
    if (matches.length === 0) return undefined;
    // Tokens reset daily, so return the most recent match (mirrors the DB path)
    return matches
      .slice()
      .sort((a, b) => new Date(b.order_time) - new Date(a.order_time))[0];
  },
  // Test seam: inject an order to simulate cross-day token reuse (same token,
  // older order_time). Not used by application code.
  __seedOrder: (order) => {
    memoryOrders.unshift(order);
    return order;
  },
  createOrder: (payload) => withOrderCreateLock(() => InMemoryStore.__createOrderUnlocked(payload)),
  __createOrderUnlocked: async ({ customerId, customerName, items, pickupSlot, pickupTime, idempotencyKey, paymentMethod }) => {
    // Criterion A2: idempotency parity with the DB path
    if (idempotencyKey) {
      const duplicate = memoryOrders.find(
        (o) => String(o.customer_id) === String(customerId) && o.idempotency_key === idempotencyKey
      );
      if (duplicate) {
        Object.defineProperty(duplicate, '__idempotentReplay', {
          value: true,
          enumerable: false,
          configurable: true
        });
        return duplicate;
      }
    }

    // Criterion A1: validate stock before mutating anything (fail fast + atomic-ish)
    for (const it of items) {
      const menu = memoryMenuItems.find((m) => m._id === it.item_id || m.item_id === it.item_id);
      if (!menu) continue;
      const requestedQty = Number(it.quantity) || 1;
      if (menu.available_quantity < requestedQty) {
        const err = new Error(
          `Insufficient stock for "${menu.item_name}". Only ${menu.available_quantity} available.`
        );
        err.statusCode = 409;
        err.details = { itemId: it.item_id, requested: requestedQty, available: menu.available_quantity };
        throw err;
      }
    }

    // Criterion A1: fail fast if the pickup slot is already at capacity
    const orderDateStr = new Date().toISOString().slice(0, 10);
    if (pickupSlot && !InMemoryStore.isSlotAvailable(pickupSlot, orderDateStr)) {
      const max = memorySettings.max_orders_per_slot || 20;
      const err = new Error(
        `Pickup slot '${pickupSlot}' is completely full (capacity ${max}). Please select another slot.`
      );
      err.statusCode = 409;
      err.details = { slot: pickupSlot };
      throw err;
    }

    tokenCounter += 1;
    const tokenStr = `C-${String(tokenCounter).padStart(3, '0')}`;
    const orderId = `ORD-20261001-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrCode = await generateQRCodeDataURL(tokenStr, orderId);

    // Calculate total amount and decrements
    let total = 0;
    const orderItems = items.map((it) => {
      const menu = memoryMenuItems.find((m) => m._id === it.item_id || m.item_id === it.item_id);
      const price = menu ? menu.price : 200;
      const itemName = menu ? menu.item_name : 'Food Item';
      total += price * it.quantity;
      if (menu) {
        menu.available_quantity = Math.max(0, menu.available_quantity - it.quantity);
        if (menu.available_quantity === 0) menu.status = MENU_ITEM_STATUS.SOLD_OUT;
        else if (menu.available_quantity <= 5) menu.status = MENU_ITEM_STATUS.LIMITED;
      }
      return {
        order_item_id: 'OI-' + Math.floor(100 + Math.random() * 900),
        item_id: it.item_id,
        item_name: itemName,
        quantity: it.quantity,
        price,
        special_instruction: it.special_instruction || ''
      };
    });

    const newOrder = {
      _id: nextMemoryId(),
      order_id: orderId,
      customer_id: customerId,
      customer_name: customerName,
      token_number: tokenStr,
      qr_code: qrCode,
      items: orderItems,
      total_amount: total,
      order_time: new Date(),
      pickup_slot: pickupSlot || '13:00-13:15',
      pickup_time: pickupTime ? new Date(pickupTime) : new Date(Date.now() + 15 * 60000),
      estimated_ready_time: new Date(Date.now() + 10 * 60000),
      order_status: ORDER_STATUS.PLACED,
      // Parity with the DB path: only online payments start as paid
      payment_status: paymentMethod === 'online' ? 'paid' : 'pending',
      payment_method: paymentMethod || 'cash_on_counter',
      priority_score: 135,
      is_delayed: false,
      idempotency_key: idempotencyKey || null,
      history: [
        { from: null, to: ORDER_STATUS.PLACED, timestamp: new Date() }
      ]
    };

    memoryOrders.unshift(newOrder);

    // Reserve the slot capacity only after the order is successfully created
    if (pickupSlot) InMemoryStore.reserveSlot(pickupSlot, orderDateStr);
    return newOrder;
  },

  updateOrderStatus: (orderId, newStatus, reason = '') => {
    const order = memoryOrders.find((o) => o._id === String(orderId) || o.order_id === String(orderId));
    if (!order) return null;
    const oldStatus = order.order_status;
    order.order_status = newStatus;
    if (newStatus === ORDER_STATUS.DELAYED) {
      order.is_delayed = true;
      order.delay_reason = reason;
    }
    if (newStatus === ORDER_STATUS.READY) {
      order.actual_ready_time = new Date();
    }
    if (newStatus === ORDER_STATUS.COLLECTED || newStatus === ORDER_STATUS.COMPLETED) {
      order.collected_time = new Date();
    }
    // Release reserved pickup-slot capacity exactly once when the order reaches
    // a terminal state (collected, completed, cancelled, rejected, not collected)
    if (RELEASABLE_STATUSES.includes(newStatus) && order.pickup_slot && !order.slot_released) {
      const dateStr = new Date(order.order_time || Date.now()).toISOString().slice(0, 10);
      InMemoryStore.releaseSlot(order.pickup_slot, dateStr);
      order.slot_released = true;
    }
    order.history.push({ from: oldStatus, to: newStatus, timestamp: new Date(), reason });
    return order;
  },

  // Logs
  addLog: ({ userId, userName, role, action, details }) => {
    const log = {
      _id: 'log_' + Date.now(),
      user_id: userId,
      user_name: userName,
      role,
      action,
      details,
      created_at: new Date()
    };
    memoryLogs.unshift(log);
    return log;
  },
  getLogs: () => memoryLogs.slice(0, 50),

  // Settings
  getSettings: () => memorySettings,
  updateSettings: (newSettings) => {
    memorySettings = { ...memorySettings, ...newSettings };
    return memorySettings;
  },

  // Pickup slot capacity (in-memory parity with the PickupSlotBooking collection)
  getSlotBooked: (dateStr, slot) => memorySlotBookings[slotLedgerKey(dateStr, slot)] || 0,
  getSlotBookingMap: (dateStr) => {
    const map = {};
    const prefix = `${dateStr}|`;
    for (const [key, value] of Object.entries(memorySlotBookings)) {
      if (key.startsWith(prefix)) map[key.slice(prefix.length)] = value;
    }
    return map;
  },
  isSlotAvailable: (slot, dateStr) => {
    const max = memorySettings.max_orders_per_slot || 20;
    return (memorySlotBookings[slotLedgerKey(dateStr, slot)] || 0) < max;
  },
  reserveSlot: (slot, dateStr) => {
    if (!slot) return { success: true, booked: 0 };
    const max = memorySettings.max_orders_per_slot || 20;
    const key = slotLedgerKey(dateStr, slot);
    const current = memorySlotBookings[key] || 0;
    if (current >= max) {
      return {
        success: false,
        message: `Pickup slot '${slot}' is completely full (capacity ${max}). Please select another slot.`
      };
    }
    memorySlotBookings[key] = current + 1;
    return { success: true, booked: current + 1 };
  },
  releaseSlot: (slot, dateStr) => {
    if (!slot) return false;
    const key = slotLedgerKey(dateStr, slot);
    const current = memorySlotBookings[key] || 0;
    if (current <= 0) return false;
    memorySlotBookings[key] = current - 1;
    return true;
  },

  /**
   * Deallocates a pickup slot when no active order still depends on it.
   * In-memory parity with slotService.clearSlotIfEmpty: repairs stale ledger
   * counts and marks the release flag on non-active orders without deleting
   * anything.
   */
  clearSlotIfEmpty: (slot, dateStr) => {
    if (!slot) {
      return { success: false, status: 400, message: 'Pickup slot is required.' };
    }

    const inSlot = memoryOrders.filter((order) => {
      if (order.pickup_slot !== slot) return false;
      const orderDate = new Date(order.order_time || Date.now()).toISOString().slice(0, 10);
      return orderDate === dateStr;
    });
    const activeOrders = inSlot.filter((order) =>
      ACTIVE_ORDER_STATUSES.includes(order.order_status)
    );

    if (activeOrders.length > 0) {
      return {
        success: false,
        status: 409,
        message: `Slot ${slot} still has ${activeOrders.length} active order(s). Complete or cancel them first.`,
        activeOrderCount: activeOrders.length
      };
    }

    const key = slotLedgerKey(dateStr, slot);
    const released = memorySlotBookings[key] || 0;
    delete memorySlotBookings[key];

    for (const order of inSlot) {
      order.slot_released = true;
    }

    return {
      success: true,
      date: dateStr,
      slot,
      released,
      booked: 0
    };
  },

  /**
   * Force-resets all pickup-slot reservations for a day (demo/operational
   * recovery). In-memory parity with slotService.resetSlotBookings.
   */
  resetSlotBookings: (dateStr) => {
    const prefix = `${dateStr}|`;
    let slotsReset = 0;
    let released = 0;

    for (const key of Object.keys(memorySlotBookings)) {
      if (!key.startsWith(prefix)) continue;
      slotsReset += 1;
      released += Number(memorySlotBookings[key] || 0);
      delete memorySlotBookings[key];
    }

    for (const order of memoryOrders) {
      if (!order.pickup_slot) continue;
      const orderDate = new Date(order.order_time || Date.now()).toISOString().slice(0, 10);
      if (orderDate === dateStr) order.slot_released = true;
    }

    return {
      date: dateStr,
      slotsReset,
      released,
      booked: 0
    };
  },

  /**
   * Rebuilds the slot ledger from live orders, repairing stale reservations
   * and slot_released flags. Never deletes orders. apply=false is a dry run.
   */
  reconcileSlotBookings: ({ apply = false } = {}) => {
    const expected = {};
    let releasedFlagsFixed = 0;

    for (const order of memoryOrders) {
      if (!order.pickup_slot) continue;
      const dateStr = new Date(order.order_time || Date.now()).toISOString().slice(0, 10);
      const key = slotLedgerKey(dateStr, order.pickup_slot);
      const isActive = ACTIVE_ORDER_STATUSES.includes(order.order_status);

      if (isActive) {
        expected[key] = (expected[key] || 0) + 1;
        if (order.slot_released) {
          releasedFlagsFixed += 1;
          if (apply) order.slot_released = false;
        }
      } else if (order.slot_released !== true) {
        releasedFlagsFixed += 1;
        if (apply) order.slot_released = true;
      }
    }

    const keys = new Set([...Object.keys(memorySlotBookings), ...Object.keys(expected)]);
    const changes = [];

    for (const key of keys) {
      const [date, slot] = key.split('|');
      const before = memorySlotBookings[key] || 0;
      const after = expected[key] || 0;
      if (before === after) continue;

      changes.push({ date, slot, before, after });
      if (apply) {
        if (after === 0) delete memorySlotBookings[key];
        else memorySlotBookings[key] = after;
      }
    }

    return {
      applied: Boolean(apply),
      scannedOrders: memoryOrders.length,
      releasedFlagsFixed,
      changes
    };
  },

  // Categories CRUD (Phase 5)
  getCategories: () => [...memoryCategories],
  getCategoryById: (id) => memoryCategories.find((c) => c._id === String(id)),
  createCategory: (data) => {
    const newCat = {
      _id: 'cat_' + Date.now(),
      name: data.name,
      description: data.description || '',
      icon: data.icon || 'restaurant',
      image: data.image || '',
      is_active: data.is_active !== undefined ? data.is_active : true,
      createdAt: new Date()
    };
    memoryCategories.push(newCat);
    return newCat;
  },
  updateCategory: (id, data) => {
    const idx = memoryCategories.findIndex((c) => c._id === String(id));
    if (idx === -1) return null;
    memoryCategories[idx] = { ...memoryCategories[idx], ...data };
    return memoryCategories[idx];
  },
  deleteCategory: (id) => {
    const idx = memoryCategories.findIndex((c) => c._id === String(id));
    if (idx === -1) return null;
    const removed = memoryCategories.splice(idx, 1)[0];
    return removed;
  },

  // Canteens CRUD (Phase 5)
  getCanteens: () => [...memoryCanteens],
  getCanteenById: (id) => memoryCanteens.find((c) => c._id === String(id)),
  createCanteen: (data) => {
    const newCanteen = {
      _id: 'cant_' + Date.now(),
      name: data.name,
      location: data.location,
      opening_time: data.opening_time || '08:00',
      closing_time: data.closing_time || '20:00',
      is_active: data.is_active !== undefined ? data.is_active : true,
      contact_number: data.contact_number || '',
      createdAt: new Date()
    };
    memoryCanteens.push(newCanteen);
    return newCanteen;
  },
  updateCanteen: (id, data) => {
    const idx = memoryCanteens.findIndex((c) => c._id === String(id));
    if (idx === -1) return null;
    memoryCanteens[idx] = { ...memoryCanteens[idx], ...data };
    return memoryCanteens[idx];
  },
  deleteCanteen: (id) => {
    const idx = memoryCanteens.findIndex((c) => c._id === String(id));
    if (idx === -1) return null;
    const removed = memoryCanteens.splice(idx, 1)[0];
    return removed;
  }
};

module.exports = InMemoryStore;
