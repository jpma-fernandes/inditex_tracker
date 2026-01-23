// ============================================
// Session Management for Playwright
// Handles persistent cookies and localStorage
// ============================================

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { BrowserContext } from 'playwright';
import type { Brand } from '@/types';
import { log, logError } from './utils';

const SESSIONS_DIR = join(process.cwd(), 'data', 'sessions');

/**
 * Get the session file path for a store
 */
function getSessionPath(store: Brand): string {
  return join(SESSIONS_DIR, `${store}-session.json`);
}

/**
 * Ensure the sessions directory exists
 */
function ensureSessionsDir(): void {
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

/**
 * Check if a session file exists for a store
 */
export function hasSession(store: Brand): boolean {
  const sessionPath = getSessionPath(store);
  return existsSync(sessionPath);
}

/**
 * Load session storage state for a store
 * @param store The store brand
 * @returns The storage state object, or undefined if not found
 */
export function loadSession(store: Brand): object | undefined {
  ensureSessionsDir();
  const sessionPath = getSessionPath(store);
  
  if (!existsSync(sessionPath)) {
    log('SESSION', `No existing session found for ${store}`);
    return undefined;
  }
  
  try {
    const data = readFileSync(sessionPath, 'utf-8');
    const session = JSON.parse(data);
    log('SESSION', `Loaded existing session for ${store}`);
    return session;
  } catch (error) {
    logError('SESSION', `Failed to load session for ${store}`, error);
    return undefined;
  }
}

/**
 * Save session storage state from a browser context
 * @param store The store brand
 * @param context The Playwright browser context
 */
export async function saveSession(store: Brand, context: BrowserContext): Promise<void> {
  ensureSessionsDir();
  const sessionPath = getSessionPath(store);
  
  try {
    const storageState = await context.storageState();
    writeFileSync(sessionPath, JSON.stringify(storageState, null, 2), 'utf-8');
    log('SESSION', `Saved session for ${store} (${storageState.cookies?.length || 0} cookies)`);
  } catch (error) {
    logError('SESSION', `Failed to save session for ${store}`, error);
  }
}

/**
 * Delete session for a store
 * @param store The store brand
 */
export function deleteSession(store: Brand): void {
  const sessionPath = getSessionPath(store);
  
  if (existsSync(sessionPath)) {
    try {
      const { unlinkSync } = require('fs');
      unlinkSync(sessionPath);
      log('SESSION', `Deleted session for ${store}`);
    } catch (error) {
      logError('SESSION', `Failed to delete session for ${store}`, error);
    }
  }
}

/**
 * Get session age in minutes
 * @param store The store brand
 * @returns Age in minutes, or -1 if no session exists
 */
export function getSessionAge(store: Brand): number {
  const sessionPath = getSessionPath(store);
  
  if (!existsSync(sessionPath)) {
    return -1;
  }
  
  try {
    const { statSync } = require('fs');
    const stats = statSync(sessionPath);
    const ageMs = Date.now() - stats.mtime.getTime();
    return Math.floor(ageMs / (1000 * 60));
  } catch {
    return -1;
  }
}
