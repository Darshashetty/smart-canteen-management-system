const mongoose = require('mongoose');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const CanteenSetting = require('../models/CanteenSetting');
const { ROLES, DEFAULT_SETTINGS, MENU_ITEM_STATUS } = require('../config/constants');

const RESTAURANT_MENU_ADDITIONS = [
  ['ITEM-2001', 'Classic Margherita Pizza', 'Fast Food', 650, 18, 12, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2002', 'Chicken Alfredo Pasta', 'Meals', 720, 16, 15, 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2003', 'Grilled Chicken Steak', 'Meals', 950, 12, 18, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2004', 'Beef Lasagna', 'Meals', 780, 14, 14, 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2005', 'Chicken Tikka Platter', 'Meals', 850, 15, 16, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2006', 'Classic Caesar Salad', 'Meals', 480, 20, 7, 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2007', 'French Toast Breakfast', 'Breakfast', 420, 18, 8, 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2008', 'Omelette with Toast', 'Breakfast', 380, 20, 7, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2009', 'Buttermilk Pancake Stack', 'Breakfast', 460, 15, 10, 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2010', 'Chicken Nuggets', 'Snacks', 390, 24, 8, 'https://images.unsplash.com/photo-1562967916-eb40622dbd92?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2011', 'Chocolate Lava Cake', 'Desserts', 450, 16, 6, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476d?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2012', 'Fresh Orange Juice', 'Beverages', 260, 30, 3, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2013', 'Mint Lemonade', 'Beverages', 280, 28, 4, 'https://images.unsplash.com/photo-1523677011781-c91d1ebe2f0a?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2014', 'Paneer Butter Masala', 'Meals', 680, 16, 14, 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2015', 'Dal Makhani', 'Meals', 520, 20, 12, 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2016', 'Chicken Seekh Kebab', 'Meals', 760, 14, 15, 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2017', 'Fish and Chips', 'Fast Food', 690, 14, 15, 'https://images.unsplash.com/photo-1579208030886-b937da0925dc?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2018', 'Chicken Club Sandwich', 'Fast Food', 560, 18, 9, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2019', 'Loaded Nachos', 'Snacks', 420, 22, 7, 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2020', 'Crispy Onion Rings', 'Snacks', 320, 25, 6, 'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2021', 'Chicken Spring Rolls', 'Snacks', 380, 20, 8, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2022', 'Tandoori Momos', 'Snacks', 450, 18, 10, 'https://images.unsplash.com/photo-1626776876729-bab4369a5a5a?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2023', 'Strawberry Milkshake', 'Beverages', 390, 24, 5, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2024', 'Iced Americano', 'Beverages', 300, 30, 3, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2025', 'Classic Hot Chocolate', 'Beverages', 340, 22, 5, 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2026', 'Blueberry Cheesecake', 'Desserts', 520, 12, 4, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2027', 'Gulab Jamun Sundae', 'Desserts', 480, 14, 5, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-2028', 'Fresh Fruit Trifle', 'Desserts', 440, 16, 5, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=85']
].map(([item_id, item_name, category, price, available_quantity, preparation_time, image]) => ({
  item_id,
  item_name,
  category,
  price,
  available_quantity,
  preparation_time,
  image,
  status: MENU_ITEM_STATUS.AVAILABLE
}));

const REQUESTED_MENU_ADDITIONS = [
  ['ITEM-3001', 'Oreo Milkshake', 'Beverages', 180, 24, 5, 'Creamy vanilla shake blended with Oreo cookies.', 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Oreo_milkshake_-_Creperie_Doux_Sourire_2025-05-03.jpg'],
  ['ITEM-3002', 'Badam Milk', 'Beverages', 120, 24, 5, 'Chilled almond milk with saffron and cardamom.', 'https://upload.wikimedia.org/wikipedia/commons/3/3c/BadamMilk.JPG'],
  ['ITEM-3003', 'Strawberry Frappe', 'Beverages', 180, 20, 6, 'Cold strawberry frappe finished with whipped cream.', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-3004', 'Peach Iced Tea', 'Beverages', 100, 28, 4, 'Refreshing peach tea served over ice.', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-3005', 'Puri Bhaji', 'Breakfast', 120, 20, 10, 'Fluffy puris served with spiced potato bhaji.', 'https://upload.wikimedia.org/wikipedia/commons/6/60/Puri_Bhajji_in_Mumbai_Restaurant.JPG'],
  ['ITEM-3006', 'Veg Sandwich', 'Breakfast', 100, 20, 7, 'Toasted sandwich with fresh vegetables and cheese.', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-3007', 'Pongal', 'Breakfast', 100, 18, 10, 'South Indian rice and lentil breakfast with pepper and ghee.', 'https://upload.wikimedia.org/wikipedia/commons/5/50/Pongal_-_1.jpg'],
  ['ITEM-3008', 'Idli Vada Combo', 'Breakfast', 120, 18, 9, 'Steamed idli and crisp vada served with sambar.', 'https://upload.wikimedia.org/wikipedia/commons/0/02/Idli_Sambar-Noida-UP-SP004.jpg'],
  ['ITEM-3009', 'Chocolate Brownie', 'Desserts', 100, 20, 4, 'Warm fudgy chocolate brownie.', 'https://upload.wikimedia.org/wikipedia/commons/d/df/Brownie_dessert_%2843110731564%29.jpg'],
  ['ITEM-3010', 'Rasmalai', 'Desserts', 140, 16, 5, 'Soft cheese dumplings in chilled saffron milk.', 'https://upload.wikimedia.org/wikipedia/commons/1/10/Rasmalai_3.jpg'],
  ['ITEM-3011', 'Carrot Halwa', 'Desserts', 120, 18, 6, 'Slow-cooked carrot dessert with nuts and cardamom.', 'https://upload.wikimedia.org/wikipedia/commons/9/96/Delicious_Gajar_Ka_Halwa.jpg'],
  ['ITEM-3012', 'Ice Cream Sundae', 'Desserts', 150, 18, 5, 'Vanilla ice cream with chocolate sauce and toppings.', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-3013', 'Paneer Burger', 'Fast Food', 220, 18, 10, 'Crispy paneer patty with lettuce, cheese, and sauce.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-3014', 'Veg Cheese Pizza', 'Fast Food', 350, 16, 14, 'Loaded vegetable pizza with a generous cheese topping.', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-3015', 'Paneer Wrap', 'Fast Food', 180, 20, 8, 'Spiced paneer, salad, and mint sauce wrapped in flatbread.', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-3016', 'Veg Momos', 'Fast Food', 180, 22, 9, 'Steamed vegetable dumplings with chilli dip.', 'https://upload.wikimedia.org/wikipedia/commons/4/40/Veg_Momos_2.jpg'],
  ['ITEM-3017', 'Chilli Cheese Toast', 'Fast Food', 150, 30, 5, 'Grilled bread topped with melted cheese, chilli, and herbs.', 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-3018', 'Tandoori Pizza', 'Fast Food', 400, 14, 15, 'Wood-fired pizza topped with tandoori vegetables.', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-3019', 'Aloo Tikki Burger', 'Fast Food', 200, 22, 9, 'Crisp potato tikki burger with chutneys and onions.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-3020', 'Paneer Butter Masala with Rice', 'Meals', 280, 16, 15, 'Creamy paneer curry served with fragrant basmati rice.', 'https://upload.wikimedia.org/wikipedia/commons/1/19/Paneer_butter_masala_2.jpg'],
  ['ITEM-3021', 'Veg Fried Rice', 'Meals', 180, 20, 10, 'Wok-tossed rice with seasonal vegetables and soy.', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-3022', 'North Indian Thali', 'Meals', 350, 12, 18, 'Complete thali with dal, vegetables, roti, rice, and dessert.', 'https://upload.wikimedia.org/wikipedia/commons/8/8b/North_Indian_Vegetarian_Thali-MB51.jpg'],
  ['ITEM-3023', 'Paneer Puff', 'Snacks', 100, 24, 6, 'Flaky pastry filled with spiced paneer.', 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Pastelitos_de_hojaldre_con_puerro_y_tofu_-_Vegan_leek_and_tofu_puff_pastry_%285592619766%29.jpg'],
  ['ITEM-3024', 'Veg Spring Roll', 'Snacks', 140, 24, 7, 'Crisp rolls filled with seasoned vegetables.', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-3025', 'Cheese Sandwich', 'Snacks', 120, 24, 6, 'Grilled bread with melted cheese and herbs.', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-3026', 'Masala Fries', 'Snacks', 100, 28, 5, 'Crisp fries tossed in tangy Indian masala.', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=85'],
  ['ITEM-3027', 'Bread Pakora', 'Snacks', 80, 24, 7, 'Golden battered bread fritters with green chutney.', 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Bread_Pakora_%28Stuffed_with_Mashed-Spicy-Potatoes%29.JPG'],
  ['ITEM-3028', 'Aloo Chaat', 'Snacks', 100, 22, 6, 'Crisp potato bites with chutneys, yogurt, and spices.', 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Aloo_Chaat.jpg']
].map(([item_id, item_name, category, price, available_quantity, preparation_time, description, image]) => ({
  item_id,
  item_name,
  category,
  price,
  available_quantity,
  preparation_time,
  description,
  image,
  status: MENU_ITEM_STATUS.AVAILABLE
}));

const EXTRA_MENU_ADDITIONS = [
  ['ITEM-4001', 'Masala Dosa', 'Breakfast', 320, 20, 12, 'Golden crispy dosa stuffed with spiced potato masala, served with chutney.', 'https://upload.wikimedia.org/wikipedia/commons/4/43/Masala_dosa_01.jpg'],
  ['ITEM-4002', 'Aloo Paratha', 'Breakfast', 300, 22, 10, 'Flaky whole-wheat paratha stuffed with spiced potatoes and served with curd.', 'https://upload.wikimedia.org/wikipedia/commons/8/85/Aloo_Paratha_%2896238%29.jpg'],
  ['ITEM-4003', 'Samosa', 'Snacks', 180, 30, 5, 'Crispy fried pastry filled with spiced potatoes and peas.', 'https://upload.wikimedia.org/wikipedia/commons/9/95/Samosa_with_sweet_chutney.jpg'],
  ['ITEM-4004', 'Veg Chowmein', 'Fast Food', 340, 24, 9, 'Wok-tossed noodles with fresh vegetables and house sauces.', 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Veg_Chowmein_Indian_Style%21.jpg']
].map(([item_id, item_name, category, price, available_quantity, preparation_time, description, image]) => ({
  item_id,
  item_name,
  category,
  price,
  available_quantity,
  preparation_time,
  description,
  image,
  status: MENU_ITEM_STATUS.AVAILABLE
}));

const BASELINE_IMAGE_REPAIRS = {
  'Fruit Custard': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Fruit_custard.JPG',
  'Gulab Jamun': 'https://upload.wikimedia.org/wikipedia/commons/6/61/Gulab_Jamun_Indian_Dessert.jpg',
  Brownie: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Brownie_dessert_%2843110731564%29.jpg',
  'Mango Lassi': 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Mango_Lassi_and_Butter_Milk_-_Vel_South_Indian_Kitchen_%2B_Bar.jpg',
  'Fresh Lime Soda': 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Fresh_Lime.JPG',
  'Masala Chai': 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Masala_Chai.jpg',
  'Cold Coffee': 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Cold_Cofee_op.jpg',
  'Chole Bhature': 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Chole_Bhature_6.jpg',
  'Rajma Rice': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Rajma_Rice.JPG',
  'Chicken Biryani': 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Chicken_biriyani-_My_cafe_restaurant_-_Meghalaya_DSC_009.jpg',
  'Veg Chowmein': 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Veg_Chowmein_Indian_Style%21.jpg',
  Samosa: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Samosa_with_sweet_chutney.jpg',
  'Paneer Roll': 'https://upload.wikimedia.org/wikipedia/commons/7/75/Paneer_kathi_roll_homemade.jpg',
  'Veg Burger': 'https://upload.wikimedia.org/wikipedia/commons/3/32/VEG_BURGER_AND_GARLIC_TOASTS.jpg',
  'Idli Sambar': 'https://upload.wikimedia.org/wikipedia/commons/0/02/Idli_Sambar-Noida-UP-SP004.jpg',
  'Masala Dosa': 'https://upload.wikimedia.org/wikipedia/commons/4/43/Masala_dosa_01.jpg',
  'Aloo Paratha': 'https://upload.wikimedia.org/wikipedia/commons/8/85/Aloo_Paratha_%2896238%29.jpg'
};

const MENU_ADDITIONS = REQUESTED_MENU_ADDITIONS;

const validateMenuAdditions = (items) => {
  if (items.length !== 28) {
    throw new Error(`Expected exactly 28 menu additions, found ${items.length}.`);
  }

  const ids = new Set();
  const names = new Set();
  for (const item of items) {
    const normalizedName = item.item_name.trim().toLowerCase();
    if (ids.has(item.item_id) || names.has(normalizedName)) {
      throw new Error(`Duplicate menu addition detected: ${item.item_id} / ${item.item_name}`);
    }
    ids.add(item.item_id);
    names.add(normalizedName);
  }
};

const seedMenuAdditions = async () => {
  validateMenuAdditions(MENU_ADDITIONS);

  const existingItems = await MenuItem.find({}, { item_id: 1, item_name: 1 }).lean();
  const existingIds = new Set(existingItems.map((item) => item.item_id).filter(Boolean));
  const existingNames = new Set(
    existingItems.map((item) => item.item_name.trim().toLowerCase()).filter(Boolean)
  );

  const conflictingNames = MENU_ADDITIONS.filter((item) => {
    return !existingIds.has(item.item_id) && existingNames.has(item.item_name.trim().toLowerCase());
  });

  if (conflictingNames.length > 0) {
    throw new Error(
      `Menu addition name conflicts with an existing item: ${conflictingNames.map((item) => item.item_name).join(', ')}`
    );
  }

  let inserted = 0;
  for (const item of MENU_ADDITIONS) {
    if (existingIds.has(item.item_id)) continue;
    await MenuItem.create(item);
    inserted += 1;
  }

  console.log(`[Seed] Menu additions verified: ${MENU_ADDITIONS.length}; inserted: ${inserted}.`);
  return { inserted, totalAdditions: MENU_ADDITIONS.length };
};

const seedInitialData = async () => {
  try {
    // 1. Seed Canteen Settings if not present
    const existingSettings = await CanteenSetting.findOne();
    if (!existingSettings) {
      await CanteenSetting.create(DEFAULT_SETTINGS);
      console.log('[Seed] Canteen settings and limits initialized.');
    }

    // 2. Seed Default Accounts for each role (only if missing, so a shared
    //    legacy database still gets the current app's role accounts)
    const defaultUsers = [
      {
        name: 'System Administrator',
        email: 'admin@canteen.com',
        password: 'password123',
        role: ROLES.ADMIN,
        phone: '+923001234570'
      },
      {
        name: 'Canteen Manager',
        email: 'manager@canteen.com',
        password: 'password123',
        role: ROLES.MANAGER,
        phone: '+923001234569'
      },
      {
        name: 'Kitchen Chef / Staff',
        email: 'staff@canteen.com',
        password: 'password123',
        role: ROLES.STAFF,
        phone: '+923001234568'
      },
      {
        name: 'Student Customer',
        email: 'customer@canteen.com',
        password: 'password123',
        role: ROLES.CUSTOMER,
        phone: '+923001234567'
      }
    ];

    for (const u of defaultUsers) {
      const existing = await User.findOne({ email: u.email });
      if (!existing) {
        await User.create(u);
        console.log(`[Seed] Created missing default ${u.role} account: ${u.email}`);
      }
    }

    // 3. Seed Extended Menu Items with high quality images and pricing
    const menuCount = await MenuItem.countDocuments();
    if (menuCount === 0) {
      const initialItems = [
        {
          item_id: 'ITEM-1001',
          item_name: 'Chicken Deluxe Burger',
          category: 'Fast Food',
          price: 450,
          available_quantity: 25,
          preparation_time: 8,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1002',
          item_name: 'Golden Crispy Fries',
          category: 'Fast Food',
          price: 200,
          available_quantity: 35,
          preparation_time: 5,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1003',
          item_name: 'Cold Drink 500ml',
          category: 'Beverages',
          price: 100,
          available_quantity: 50,
          preparation_time: 2,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1004',
          item_name: 'Club Sandwich Supreme',
          category: 'Fast Food',
          price: 380,
          available_quantity: 20,
          preparation_time: 7,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1005',
          item_name: 'Chicken Shawarma Wrap',
          category: 'Fast Food',
          price: 320,
          available_quantity: 18,
          preparation_time: 6,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1006',
          item_name: 'Fresh Garden Salad Bowl',
          category: 'Meals',
          price: 250,
          available_quantity: 15,
          preparation_time: 4,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1007',
          item_name: 'Hot Cappuccino',
          category: 'Beverages',
          price: 180,
          available_quantity: 40,
          preparation_time: 3,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1008',
          item_name: 'Artisanal Veggie Buddha Bowl',
          category: 'Meals',
          price: 420,
          available_quantity: 14,
          preparation_time: 9,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1009',
          item_name: 'Classic Iced Matcha Latte',
          category: 'Beverages',
          price: 260,
          available_quantity: 30,
          preparation_time: 4,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1010',
          item_name: 'Spicy Paneer Tikka Wrap',
          category: 'Meals',
          price: 340,
          available_quantity: 16,
          preparation_time: 8,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1011',
          item_name: 'Double Chocolate Fudge Brownie',
          category: 'Desserts',
          price: 220,
          available_quantity: 22,
          preparation_time: 3,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1012',
          item_name: 'Smokey BBQ Beef Burger',
          category: 'Fast Food',
          price: 520,
          available_quantity: 18,
          preparation_time: 10,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1013',
          item_name: 'Crispy Chicken Zinger Roll',
          category: 'Fast Food',
          price: 360,
          available_quantity: 20,
          preparation_time: 6,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1014',
          item_name: 'Mango Passion Fruit Cooler',
          category: 'Beverages',
          price: 190,
          available_quantity: 35,
          preparation_time: 3,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1015',
          item_name: 'Cheesy Garlic Bread Sticks',
          category: 'Snacks',
          price: 240,
          available_quantity: 28,
          preparation_time: 6,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80'
        },
        {
          item_id: 'ITEM-1016',
          item_name: 'Velvety Red Velvet Pastry',
          category: 'Desserts',
          price: 250,
          available_quantity: 15,
          preparation_time: 2,
          status: MENU_ITEM_STATUS.AVAILABLE,
          image: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=600&q=80'
        }
      ];

      for (const item of initialItems) {
        await MenuItem.create(item);
      }
      console.log(`[Seed] Initial ${initialItems.length} menu items populated according to specification.`);
    }

    await seedMenuAdditions();
  } catch (error) {
    console.error('[Seed Error] Failed to populate seed data:', error.message);
    throw error;
  }
};

module.exports = seedInitialData;
module.exports.MENU_ADDITIONS = MENU_ADDITIONS;
module.exports.validateMenuAdditions = validateMenuAdditions;
