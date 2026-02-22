const mongoose = require('mongoose');
require('dotenv').config();

const { Part } = require('../models/Part');

function isGarbageRef(ref) {
  const s = String(ref || '').trim();
  if (!s) return true;
  if (/^\++$/.test(s)) return true;
  return false;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL in environment');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.DATABASE_URL);
  console.log('Connected.');

  const parts = await Part.find({
    $or: [
      { 'pendingOrders.reference': { $exists: true } },
      { 'pendingOrders.references.0': { $exists: true } }
    ]
  });

  let partsTouched = 0;
  let ordersTouched = 0;
  let refsRemoved = 0;

  for (const part of parts) {
    let partChanged = false;

    if (!Array.isArray(part.pendingOrders)) continue;

    for (const order of part.pendingOrders) {
      let orderChanged = false;

      // Clean references[]
      if (Array.isArray(order.references) && order.references.length > 0) {
        const before = order.references.length;
        const cleaned = order.references
          .map(r => String(r || '').trim())
          .filter(r => r.length > 0)
          .filter(r => !/^\++$/.test(r));

        if (cleaned.length !== before) {
          order.references = cleaned;
          refsRemoved += (before - cleaned.length);
          orderChanged = true;
        }
      }

      // Clean legacy reference
      if (order.reference !== undefined && order.reference !== null) {
        if (isGarbageRef(order.reference)) {
          order.reference = null;
          orderChanged = true;
        } else {
          // normalize trim
          const trimmed = String(order.reference).trim();
          if (trimmed !== order.reference) {
            order.reference = trimmed;
            orderChanged = true;
          }
        }
      }

      // Sync legacy <-> array (keep compatibility)
      // If reference is null but references has values, set reference to first.
      if ((!order.reference || String(order.reference).trim() === '') && Array.isArray(order.references) && order.references.length > 0) {
        order.reference = order.references[0];
        orderChanged = true;
      }

      // If references empty but reference has value, set references = [reference]
      if ((!Array.isArray(order.references) || order.references.length === 0) && order.reference) {
        const r = String(order.reference).trim();
        if (r && !/^\++$/.test(r)) {
          order.references = [r];
          orderChanged = true;
        }
      }

      if (orderChanged) {
        ordersTouched += 1;
        partChanged = true;
      }
    }

    if (partChanged) {
      partsTouched += 1;
      await part.save();
    }
  }

  console.log('Done.');
  console.log(JSON.stringify({ partsScanned: parts.length, partsTouched, ordersTouched, refsRemoved }, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Script failed:', err);
  try {
    await mongoose.disconnect();
  } catch (_e) {
    // ignore
  }
  process.exit(1);
});
