const MenuItem = require('../models/MenuItem');
const { MENU_ITEM_STATUS } = require('../config/constants');

/**
 * Restores previously-decremented stock for a menu item.
 *
 * `$inc`/`updateOne` bypass the MenuItem pre-save hook, so a failed order or a
 * cancellation would otherwise leave the item stuck at `Sold Out` even after
 * its quantity is restored (making it permanently unsellable). This helper
 * re-derives `status` from the restored quantity, mirroring the hook.
 */
const restoreMenuItemStock = async (itemId, qty, stockField = 'available_quantity') => {
  const item = await MenuItem.findByIdAndUpdate(
    itemId,
    {
      $inc: {
        [stockField]: qty,
        total_orders_count: -1,
        total_quantity_sold: -qty
      }
    },
    { returnDocument: 'after' }
  );
  if (!item) return null;

  const quantityNow = Number(item[stockField] ?? item.available_quantity ?? 0);
  let correctedStatus = item.status;
  if (quantityNow <= 0) {
    correctedStatus = MENU_ITEM_STATUS.SOLD_OUT;
  } else if (quantityNow <= 5) {
    correctedStatus =
      item.status === MENU_ITEM_STATUS.TEMPORARILY_UNAVAILABLE
        ? MENU_ITEM_STATUS.TEMPORARILY_UNAVAILABLE
        : MENU_ITEM_STATUS.LIMITED;
  } else if (item.status === MENU_ITEM_STATUS.SOLD_OUT) {
    correctedStatus = MENU_ITEM_STATUS.AVAILABLE;
  }

  if (correctedStatus !== item.status) {
    item.status = correctedStatus;
    await item.save();
  }
  return item;
};

module.exports = { restoreMenuItemStock };
