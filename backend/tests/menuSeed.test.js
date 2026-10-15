const { MENU_ADDITIONS, validateMenuAdditions } = require('../src/seed/seedData');

describe('menu seed additions', () => {
  test('defines exactly 28 unique additions with required fields', () => {
    expect(MENU_ADDITIONS).toHaveLength(28);
    validateMenuAdditions(MENU_ADDITIONS);

    for (const item of MENU_ADDITIONS) {
      expect(item.item_id).toMatch(/^ITEM-\d+$/);
      expect(item.item_name).toEqual(expect.any(String));
      expect(item.category).toEqual(expect.any(String));
      expect(item.price).toBeGreaterThan(0);
      expect(item.available_quantity).toBeGreaterThan(0);
      expect(item.preparation_time).toBeGreaterThan(0);
      expect(item.description).toEqual(expect.any(String));
      expect(item.image).toMatch(/^https?:\/\//);
    }
  });

  test('rejects duplicate addition ids or names', () => {
    const duplicate = [...MENU_ADDITIONS, { ...MENU_ADDITIONS[0] }];
    expect(() => validateMenuAdditions(duplicate)).toThrow(/Expected exactly 28/);

    const renamedDuplicate = MENU_ADDITIONS.map((item) => ({ ...item }));
    renamedDuplicate[1].item_name = renamedDuplicate[0].item_name;
    expect(() => validateMenuAdditions(renamedDuplicate)).toThrow(/Duplicate menu addition/);
  });

  test('keeps the requested addition category distribution stable', () => {
    const counts = MENU_ADDITIONS.reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + 1;
      return result;
    }, {});

    expect(counts).toEqual({
      Beverages: 4,
      Breakfast: 4,
      Desserts: 4,
      'Fast Food': 7,
      Meals: 3,
      Snacks: 6
    });
  });
});
