import { createHmac, timingSafeEqual } from 'node:crypto';

const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const REQUIRED_ID = /^[A-Za-z0-9_-]{1,128}$/;

function id(value, field) {
  if (typeof value !== 'string' || !REQUIRED_ID.test(value)) throw new Error(\`invalid \${field}\`);
  return value;
}
function instant(value, field) {
  if (typeof value !== 'string' || !ISO_WITH_ZONE.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error(\`\${field} requires ISO-8601 with timezone\`);
  }
  return Date.parse(value);
}
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}
function validSession(input) {
  const studioId = id(input.studioId, 'studioId');
  const sessionId = id(input.sessionId, 'sessionId');
  const instructorId = id(input.instructorId, 'instructorId');
  const branchId = id(input.branchId, 'branchId');
  const roomId = input.roomId == null ? null : id(input.roomId, 'roomId');
  const start = instant(input.startsAt, 'startsAt');
  const end = instant(input.endsAt, 'endsAt');
  if (end <= start || end - start > 8 * 60 * 60_000 || end - start < 10 * 60_000) {
    throw new Error('session duration must be 10 minutes to 8 hours');
  }
  return { studioId, sessionId, instructorId, branchId, roomId, start, end };
}

/** Pure admission rule; persistence must enforce serializable/locking collision checks separately. */
export function assessSessionBooking(candidate, existing = []) {
  const next = validSession(candidate);
  if (!Array.isArray(existing)) throw new Error('existing sessions must be an array');
  for (const record of existing) {
    if (record.status === 'CANCELLED') continue;
    const old = validSession(record);
    if (old.studioId !== next.studioId) continue;
    if (old.sessionId === next.sessionId) return { ok: false, reason: 'SESSION_EXISTS' };
    if (!overlaps(next.start, next.end, old.start, old.end)) continue;
    if (old.instructorId === next.instructorId) return { ok: false, reason: 'INSTRUCTOR_CONFLICT' };
    if (next.roomId && old.branchId === next.branchId && old.roomId === next.roomId) {
      return { ok: false, reason: 'ROOM_CONFLICT' };
    }
  }
  return { ok: true, reason: null };
}

function secretKey(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('attendance signing secret must be at least 32 bytes');
  }
  return secret;
}
function mac(encoded, secret) {
  return createHmac('sha256', secretKey(secret)).update(encoded).digest();
}

/** Backend-only issuance: caller MUST enforce instructor/studio authorization. */
export function issueAttendanceToken({ studioId, sessionId, studentId, enrolledStudentIds, issuedAt, secret, ttlSeconds = 600 }) {
  studioId = id(studioId, 'studioId');
  sessionId = id(sessionId, 'sessionId');
  studentId = id(studentId, 'studentId');
  if (!Array.isArray(enrolledStudentIds) || !enrolledStudentIds.includes(studentId)) throw new Error('student not enrolled');
  if (!Number.isSafeInteger(issuedAt) || issuedAt <= 0) throw new Error('invalid issuedAt');
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > 900) throw new Error('invalid token TTL');
  const encoded = Buffer.from(JSON.stringify({ v: 1, studioId, sessionId, studentId, iat: issuedAt, exp: issuedAt + ttlSeconds })).toString('base64url');
  return \`\${encoded}.\${mac(encoded, secret).toString('base64url')}\`;
}

/** MUST be called only AFTER authenticated student identity is established server-side. */
export function verifyAttendanceToken({ token, studioId, sessionId, authenticatedStudentId, now, secret }) {
  studioId = id(studioId, 'studioId');
  sessionId = id(sessionId, 'sessionId');
  authenticatedStudentId = id(authenticatedStudentId, 'authenticatedStudentId');
  if (!Number.isSafeInteger(now) || now <= 0) throw new Error('invalid now');
  if (typeof token !== 'string' || token.length > 2048) throw new Error('invalid attendance token');
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) throw new Error('invalid attendance token');
  const expected = mac(parts[0], secret);
  const actual = Buffer.from(parts[1], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('invalid attendance token signature');
  let data;
  try { data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch { throw new Error('invalid attendance token payload'); }
  if (data.v !== 1 || data.studioId !== studioId || data.sessionId !== sessionId || data.studentId !== authenticatedStudentId) {
    throw new Error('attendance token subject mismatch');
  }
  if (!Number.isSafeInteger(data.iat) || !Number.isSafeInteger(data.exp) || data.exp - data.iat > 900 || data.exp <= data.iat) {
    throw new Error('invalid attendance token timestamps');
  }
  if (now < data.iat || now >= data.exp) throw new Error('attendance token not active');
  return { studioId, sessionId, studentId: authenticatedStudentId };
}

/** Idempotent domain operation. DB must enforce UNIQUE(studioId,sessionId,studentId). */
export function assessCheckIn({ session, studioId, studentId, enrolledStudentIds, authenticatedStudentId, nowIso, existingAttendance = [] }) {
  const s = validSession(session);
  studioId = id(studioId, 'studioId');
  studentId = id(studentId, 'studentId');
  if (s.studioId !== studioId || studentId !== authenticatedStudentId) return { ok: false, reason: 'SUBJECT_MISMATCH' };
  if (!Array.isArray(enrolledStudentIds) || !enrolledStudentIds.includes(studentId)) return { ok: false, reason: 'NOT_ENROLLED' };
  const now = instant(nowIso, 'nowIso');
  if (now < s.start - 20 * 60_000 || now > s.end + 30 * 60_000) return { ok: false, reason: 'OUTSIDE_ATTENDANCE_WINDOW' };
  if (existingAttendance.some(a => a.studioId === studioId && a.sessionId === s.sessionId && a.studentId === studentId)) {
    return { ok: true, reason: 'ALREADY_CHECKED_IN', existing: true };
  }
  return { ok: true, reason: 'CHECK_IN_ALLOWED', existing: false };
}
