import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { nanoid } from "nanoid";
import { REDIS_KEYS } from "./constants";
import { getRedis } from "./redis";
import type { AuthAccount, AuthSession, SubscriptionTier } from "./platform-types";

declare global {
  // eslint-disable-next-line no-var
  var chinwagAuthStore:
    | {
        accounts: Map<string, AuthAccount>;
        sessions: Map<string, AuthSession>;
        emailIndex: Map<string, string>;
      }
    | undefined;
}

const authStore =
  global.chinwagAuthStore ??
  (global.chinwagAuthStore = {
    accounts: new Map(),
    sessions: new Map(),
    emailIndex: new Map(),
  });

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const attempt = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (attempt.length !== expected.length) return false;
  return timingSafeEqual(attempt, expected);
}

function sessionToken(): string {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

async function saveAccount(account: AuthAccount): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(
      REDIS_KEYS.authAccount(account.id),
      JSON.stringify(account),
      "EX",
      86400 * 30,
    );
    await redis.set(REDIS_KEYS.authEmail(account.email), account.id, "EX", 86400 * 30);
    return;
  }
  authStore.accounts.set(account.id, account);
  authStore.emailIndex.set(account.email.toLowerCase(), account.id);
}

async function getAccountByEmail(email: string): Promise<AuthAccount | null> {
  const normalized = email.trim().toLowerCase();
  const redis = getRedis();
  if (redis) {
    const id = await redis.get(REDIS_KEYS.authEmail(normalized));
    if (!id) return null;
    const raw = await redis.get(REDIS_KEYS.authAccount(id));
    if (!raw) return null;
    return JSON.parse(raw) as AuthAccount;
  }
  const id = authStore.emailIndex.get(normalized);
  if (!id) return null;
  return authStore.accounts.get(id) ?? null;
}

async function saveSession(session: AuthSession): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(
      REDIS_KEYS.authSession(session.token),
      JSON.stringify(session),
      "EX",
      Math.floor(SESSION_TTL_MS / 1000),
    );
    return;
  }
  authStore.sessions.set(session.token, session);
}

export async function getSession(token: string): Promise<AuthSession | null> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(REDIS_KEYS.authSession(token));
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (session.expiresAt <= Date.now()) return null;
    return session;
  }
  const session = authStore.sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) return null;
  return session;
}

export async function signupUser(params: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthSession> {
  const email = params.email.trim().toLowerCase();
  if (!email.includes("@") || params.password.length < 6) {
    throw new Error("Invalid email or password");
  }

  const existing = await getAccountByEmail(email);
  if (existing) throw new Error("Account already exists");

  const account: AuthAccount = {
    id: nanoid(16),
    email,
    passwordHash: hashPassword(params.password),
    name: params.name.trim() || "User",
    tier: "free",
    verified: false,
    blockedUsers: [],
    createdAt: Date.now(),
  };

  await saveAccount(account);

  const session: AuthSession = {
    token: sessionToken(),
    userId: account.id,
    email: account.email,
    name: account.name,
    tier: account.tier,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  await saveSession(session);
  return session;
}

export async function loginUser(params: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const account = await getAccountByEmail(params.email);
  if (!account || !verifyPassword(params.password, account.passwordHash)) {
    throw new Error("Invalid credentials");
  }

  const session: AuthSession = {
    token: sessionToken(),
    userId: account.id,
    email: account.email,
    name: account.name,
    tier: account.tier,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  await saveSession(session);
  return session;
}

export async function upgradeUserTier(
  userId: string,
  tier: SubscriptionTier,
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(REDIS_KEYS.authAccount(userId));
    if (!raw) return;
    const account = JSON.parse(raw) as AuthAccount;
    account.tier = tier;
    await saveAccount(account);
    return;
  }

  const account = authStore.accounts.get(userId);
  if (!account) return;
  account.tier = tier;
  await saveAccount(account);
}