const locked = new Set();

function lock(productId) {
  if (locked.has(productId)) return false;
  locked.add(productId);
  return true;
}

function unlock(productId) {
  locked.delete(productId);
}

function isLocked(productId) {
  return locked.has(productId);
}

module.exports = { lock, unlock, isLocked };
