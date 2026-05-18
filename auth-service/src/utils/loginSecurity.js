const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const failedLogins = new Map();

function keyFor(email, ip) {
  return `${email.toLowerCase()}|${ip}`;
}

function getRecord(email, ip) {
  const key = keyFor(email, ip);
  const now = Date.now();
  const record = failedLogins.get(key);

  if (!record || record.expiresAt <= now) {
    const freshRecord = {
      count: 0,
      expiresAt: now + WINDOW_MS,
      lockedUntil: 0,
    };

    failedLogins.set(key, freshRecord);

    return freshRecord;
  }

  return record;
}

function isLocked(email, ip) {
  const record = getRecord(email, ip);

  return record.lockedUntil > Date.now();
}

function lockRemainingSeconds(email, ip) {
  const record = getRecord(email, ip);

  return Math.max(0, Math.ceil((record.lockedUntil - Date.now()) / 1000));
}

function recordFailure(email, ip) {
  const record = getRecord(email, ip);

  record.count += 1;

  if (record.count >= MAX_FAILURES) {
    record.lockedUntil = Date.now() + WINDOW_MS;
  }

  return {
    count: record.count,
    locked: record.lockedUntil > Date.now(),
  };
}

function recordSuccess(email, ip) {
  failedLogins.delete(keyFor(email, ip));
}

module.exports = {
  isLocked,
  lockRemainingSeconds,
  recordFailure,
  recordSuccess,
};
