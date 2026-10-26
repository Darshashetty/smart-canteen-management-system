const fallbackImages: Record<string, string> = {
  snacks: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80",
  meals: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
  beverages: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80",
  desserts: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=600&q=80",
  salads: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
  breakfast: "https://upload.wikimedia.org/wikipedia/commons/8/85/Aloo_Paratha_%2896238%29.jpg",
  "fast food": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80",
};

const defaultImage = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80";

const itemImages: Record<string, string> = {
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
  "chicken burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
  "deluxe chicken burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
  fries: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
  "golden crispy fries": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
  sandwich: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80",
  "club sandwich": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80",
  "club sandwich supreme": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80",
  shawarma: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
  "chicken shawarma wrap": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
  "crispy chicken zinger roll": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80",
  coffee: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
  cappuccino: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
  "hot cappuccino": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
  salad: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
  "fresh garden salad bowl": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
  "artisanal veggie buddha bowl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
  brownie: "https://upload.wikimedia.org/wikipedia/commons/d/df/Brownie_dessert_%2843110731564%29.jpg",
  "double chocolate fudge brownie": "https://upload.wikimedia.org/wikipedia/commons/d/df/Brownie_dessert_%2843110731564%29.jpg",
  "fruit custard": "https://upload.wikimedia.org/wikipedia/commons/7/72/Fruit_custard.JPG",
  "gulab jamun": "https://upload.wikimedia.org/wikipedia/commons/6/61/Gulab_Jamun_Indian_Dessert.jpg",
  "mango lassi": "https://upload.wikimedia.org/wikipedia/commons/5/5e/Mango_Lassi_and_Butter_Milk_-_Vel_South_Indian_Kitchen_%2B_Bar.jpg",
  "fresh lime soda": "https://upload.wikimedia.org/wikipedia/commons/7/7a/Fresh_Lime.JPG",
  "masala chai": "https://upload.wikimedia.org/wikipedia/commons/6/6a/Masala_Chai.jpg",
  "cold coffee": "https://upload.wikimedia.org/wikipedia/commons/c/cf/Cold_Cofee_op.jpg",
  "cold drink": "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=600&q=80",
  "cold drink 500ml": "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=600&q=80",
  "soft drink": "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=600&q=80",
  soda: "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=600&q=80",
  "mango passion fruit cooler": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
  "classic iced matcha latte": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
  "chole bhature": "https://upload.wikimedia.org/wikipedia/commons/7/7c/Chole_Bhature_6.jpg",
  "rajma rice": "https://upload.wikimedia.org/wikipedia/commons/1/1b/Rajma_Rice.JPG",
  biryani: "https://upload.wikimedia.org/wikipedia/commons/2/23/A_home_made_plate_of_mutton_biryani_served_with_chicken_kassa_cooked_in_the_bengali_style.jpg",
  samosa: "https://upload.wikimedia.org/wikipedia/commons/9/95/Samosa_with_sweet_chutney.jpg",
  "bread pakoda": "https://upload.wikimedia.org/wikipedia/commons/7/76/Bread_Pakora_-_Indian_Pakora_Recipe.jpg",
  "bread pakora": "https://upload.wikimedia.org/wikipedia/commons/7/76/Bread_Pakora_-_Indian_Pakora_Recipe.jpg",
  dosa: "https://upload.wikimedia.org/wikipedia/commons/4/43/Masala_dosa_01.jpg",
  chowmein: "https://upload.wikimedia.org/wikipedia/commons/8/8c/Veg_Chowmein_Indian_Style%21.jpg",
  "paneer roll": "https://upload.wikimedia.org/wikipedia/commons/7/75/Paneer_kathi_roll_homemade.jpg",
  "spicy paneer tikka wrap": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80",
  "veg burger": "https://upload.wikimedia.org/wikipedia/commons/3/32/VEG_BURGER_AND_GARLIC_TOASTS.jpg",
  idli: "https://upload.wikimedia.org/wikipedia/commons/0/02/Idli_Sambar-Noida-UP-SP004.jpg",
  "idli vada": "https://upload.wikimedia.org/wikipedia/commons/5/56/Idli_and_Medu_Vada.JPG",
  "idli vada combo": "https://upload.wikimedia.org/wikipedia/commons/5/56/Idli_and_Medu_Vada.JPG",
  "medu vada": "https://upload.wikimedia.org/wikipedia/commons/6/6f/Medu_Vada.JPG",
  vada: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Medu_Vada.JPG",
  "aloo paratha": "https://upload.wikimedia.org/wikipedia/commons/8/85/Aloo_Paratha_%2896238%29.jpg",
  "butter masala": "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=800&q=85",
  "dal makhani": "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=85",
  "seekh kebab": "https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=800&q=85",
  "fish and chips": "https://images.unsplash.com/photo-1579208030886-b937da0925dc?auto=format&fit=crop&w=800&q=85",
  nachos: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=800&q=85",
  "onion rings": "https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=800&q=85",
  "spring roll": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=85",
  "spring rolls": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=85",
  "veg spring roll": "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=85",
  "veg spring rolls": "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=85",
  "paneer puff": "https://upload.wikimedia.org/wikipedia/commons/6/6c/Pastelitos_de_hojaldre_con_puerro_y_tofu_-_Vegan_leek_and_tofu_puff_pastry_%285592619766%29.jpg",
  momos: "https://images.unsplash.com/photo-1626776876729-bab4369a5a5a?auto=format&fit=crop&w=800&q=85",
  milkshake: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=85",
  americano: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=85",
  "hot chocolate": "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=800&q=85",
  cheesecake: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=85",
  sundae: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=85",
  trifle: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=85",
  "beef lasagna": "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?auto=format&fit=crop&w=800&q=85",
  "beef burger": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=85",
  "smokey bbq beef burger": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=85",
  "cheesy garlic bread sticks": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80",
  "velvety red velvet pastry": "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=600&q=80",
  pizza: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=85",
  "margherita pizza": "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=85",
  "classic margherita pizza": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=85",
  "veg cheese pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=85",
  "vegetable pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=85",
  "tandoori pizza": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=85",
  "chilli cheese toast": "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=85",
  "north indian thali": "https://upload.wikimedia.org/wikipedia/commons/8/8b/North_Indian_Vegetarian_Thali-MB51.jpg",
  "veg fried rice": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=85",
  "fried rice": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=85",
  "paneer butter masala": "https://upload.wikimedia.org/wikipedia/commons/1/19/Paneer_butter_masala_2.jpg",
  "paneer wrap": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=800&q=85",
  "aloo chaat": "https://upload.wikimedia.org/wikipedia/commons/e/ea/Aloo_Chaat.jpg",
  "masala fries": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=85",
  "cheese sandwich": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=85",
  "veg momos": "https://upload.wikimedia.org/wikipedia/commons/4/40/Veg_Momos_2.jpg",
  "masala dosa": "https://upload.wikimedia.org/wikipedia/commons/4/43/Masala_dosa_01.jpg",
  "aloo tikki burger": "https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=800&q=85",
  "paneer burger": "https://upload.wikimedia.org/wikipedia/commons/f/f3/Paneer_burger.jpg",
  "chicken deluxe burger": "https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=800&q=85",
  "thali": "https://upload.wikimedia.org/wikipedia/commons/8/8b/North_Indian_Vegetarian_Thali-MB51.jpg",
};

export function normalizeMenuCategory(category: unknown): string {
  const normalized = typeof category === "string" ? category.trim().toLowerCase() : "";
  const labels: Record<string, string> = {
    "fast food": "Fast Food",
    meals: "Meals",
    beverages: "Beverages",
    snacks: "Snacks",
    desserts: "Desserts",
    salads: "Salads",
  };
  return labels[normalized] ?? (normalized ? normalized.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Other");
}

export function getMenuImage(image: unknown, category: unknown, itemName?: unknown): string {
  if (typeof image === "string" && image.trim()) {
    return image.trim();
  }

  const normalizedName = typeof itemName === "string" ? itemName.trim().toLowerCase() : "";
  const matchingItem = Object.entries(itemImages).find(([name]) => normalizedName.includes(name));
  if (matchingItem) {
    return matchingItem[1];
  }

  const normalizedCategory = normalizeMenuCategory(category).toLowerCase();
  return fallbackImages[normalizedCategory] ?? defaultImage;
}