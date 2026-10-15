const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

/**
 * Reconcile stale database indexes against the current Mongoose schemas.
 *
 * This project shares an Atlas database with an older "QuickBite" application
 * which left behind unique indexes (e.g. orders.orderNumber, orders.token,
 * users.studentId) on fields the current schemas no longer define. Because the
 * current documents never set those fields, every record stores null and the
 * next insert violates the unique constraint, causing 409 duplicate-key errors.
 *
 * Safe subset of syncIndexes(): only DROPS unique indexes that reference fields
 * unknown to the schema. It never creates or alters anything else, so genuine
 * composite/text indexes are left untouched.
 */
const reconcileIndexes = async () => {
  if (mongoose.connection.readyState !== 1) return;

  const modelsDir = path.join(__dirname, '..', 'models');
  for (const file of fs.readdirSync(modelsDir)) {
    if (file.endsWith('.js')) require(path.join(modelsDir, file));
  }

  for (const modelName of mongoose.modelNames()) {
    const model = mongoose.model(modelName);
    const schemaFields = new Set(Object.keys(model.schema.paths));
    let indexes;

    try {
      indexes = await model.collection.indexes();
    } catch (error) {
      console.warn(`[Indexes] Could not inspect ${modelName}: ${error.message}`);
      continue;
    }

    for (const index of indexes) {
      if (!index.unique || index.name === '_id_') continue;

      const keyFields = Object.keys(index.key || {}).filter(
        (field) => field !== '_id' && !field.startsWith('_')
      );
      if (keyFields.length === 0) continue;

      const referencesUnknownField = keyFields.some((field) => !schemaFields.has(field));
      if (!referencesUnknownField) continue;

      try {
        await model.collection.dropIndex(index.name);
        console.log(`[Indexes] Dropped stale unique index ${modelName}.${index.name} (${keyFields.join(', ')})`);
      } catch (error) {
        console.warn(`[Indexes] Could not drop ${modelName}.${index.name}: ${error.message}`);
      }
    }
  }
};

module.exports = reconcileIndexes;