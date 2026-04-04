import { eq, and } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { devices } from '../../db/schema.js';
import { generateDeviceId } from '../../utils/id.js';

export interface DeviceInfo {
  id: string;
  userId: string;
  name: string;
  type: 'web' | 'android' | 'ios' | 'desktop';
  lastSeenAt: number;
  isOnline: number;
  createdAt: number;
}

export interface RegisterDeviceInput {
  userId: string;
  name: string;
  type: 'web' | 'android' | 'ios' | 'desktop';
}

export const deviceService = {
  async registerDevice(input: RegisterDeviceInput): Promise<DeviceInfo> {
    const id = generateDeviceId();
    const now = Math.floor(Date.now() / 1000);

    await db.insert(devices).values({
      id,
      userId: input.userId,
      name: input.name,
      type: input.type,
      lastSeenAt: now,
      isOnline: 1,
      createdAt: now,
    });

    return {
      id,
      userId: input.userId,
      name: input.name,
      type: input.type,
      lastSeenAt: now,
      isOnline: 1,
      createdAt: now,
    };
  },

  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    const result = await db.select().from(devices).where(eq(devices.userId, userId));
    return result as DeviceInfo[];
  },

  async getDeviceById(id: string): Promise<DeviceInfo | null> {
    const result = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
    return (result[0] as DeviceInfo) ?? null;
  },

  async updateDeviceHeartbeat(id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db
      .update(devices)
      .set({ lastSeenAt: now, isOnline: 1 })
      .where(eq(devices.id, id));
  },

  async setDeviceOffline(id: string): Promise<void> {
    await db.update(devices).set({ isOnline: 0 }).where(eq(devices.id, id));
  },

  async unbindDevice(id: string, userId: string): Promise<boolean> {
    const existing = await db
      .select()
      .from(devices)
      .where(and(eq(devices.id, id), eq(devices.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    await db.delete(devices).where(and(eq(devices.id, id), eq(devices.userId, userId)));
    return true;
  },

  async getOnlineDevices(userId: string): Promise<DeviceInfo[]> {
    const result = await db
      .select()
      .from(devices)
      .where(and(eq(devices.userId, userId), eq(devices.isOnline, 1)));
    return result as DeviceInfo[];
  },
};
