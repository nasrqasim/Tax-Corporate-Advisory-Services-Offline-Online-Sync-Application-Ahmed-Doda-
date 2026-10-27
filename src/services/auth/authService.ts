/**
 * Authentication and User Management Service
 * Supports offline-first authentication, salted SHA-256 password hashing,
 * Super Admin idempotent seeding, and role-based permissions.
 */

import { AppUser, UserRole } from '../../types/settings';
import { computeSha256 } from '../security/crypto';
import { safeStorage } from '../sqlite/storage';

const AUTH_USER_STORAGE_KEY = 'tax_crm_auth_user_v1';
const USERS_STORAGE_KEY = 'tax_crm_registered_users_v1';
const PASSWORD_SALT = 'ahmed_doda_tax_crm_2026_salt_914836';

// Super Admin initial configuration
export const SUPER_ADMIN_EMAIL = 'ahmeddodataxcrm@gmail.com';
const INITIAL_SUPER_ADMIN_PASS = 'Ahmed#@Doda2CO';

class AuthService {
  private currentUser: AppUser | null = null;
  private isInitialized = false;

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    // Load active session if any
    const storedSession = safeStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (storedSession) {
      try {
        this.currentUser = JSON.parse(storedSession);
      } catch {
        this.currentUser = null;
      }
    }

    // Ensure Super Admin exists in the users table
    await this.ensureSuperAdminAccount();
    this.isInitialized = true;
  }

  /**
   * Hashes a password with a cryptographic salt using SHA-256
   */
  public async hashPassword(password: string): Promise<string> {
    return computeSha256(`${password}:${PASSWORD_SALT}`);
  }

  /**
   * Ensures the initial Super Admin account is seeded idempotently
   */
  private async ensureSuperAdminAccount(): Promise<void> {
    const users = this.getAllUsers();
    const normalizedEmail = SUPER_ADMIN_EMAIL.trim().toLowerCase();

    const existingAdmin = users.find(
      (u) => u.email && u.email.trim().toLowerCase() === normalizedEmail
    );

    const targetHash = await this.hashPassword(INITIAL_SUPER_ADMIN_PASS);

    if (!existingAdmin) {
      const superAdmin: AppUser = {
        id: 'usr-super-admin',
        name: 'Ahmed Doda (Super Admin)',
        email: normalizedEmail,
        role: 'super_admin',
        passwordHash: targetHash,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      users.unshift(superAdmin);
      this.saveUsers(users);
    } else {
      // Ensure Super Admin has the official updated password and super_admin role
      existingAdmin.passwordHash = targetHash;
      existingAdmin.role = 'super_admin';
      existingAdmin.isActive = true;
      this.saveUsers(users);
    }
  }

  public getAllUsers(): AppUser[] {
    const raw = safeStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveUsers(users: AppUser[]): void {
    safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  /**
   * Authenticate a user with email and password
   */
  public async login(email: string, password: string): Promise<{ success: boolean; user?: AppUser; message?: string }> {
    await this.init();

    const normalizedEmail = (email || '').trim().toLowerCase();
    const trimmedPassword = (password || '').trim();

    if (!normalizedEmail || !trimmedPassword) {
      return { success: false, message: 'Please enter both email address and password.' };
    }

    const users = this.getAllUsers();
    let user = users.find((u) => u.email && u.email.trim().toLowerCase() === normalizedEmail);

    // If Super Admin account does not exist yet or email matches, ensure seeded
    if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      if (!user) {
        await this.ensureSuperAdminAccount();
        user = this.getAllUsers().find((u) => u.email && u.email.trim().toLowerCase() === normalizedEmail);
      }
      // Support official Super Admin password
      if (trimmedPassword === 'Ahmed#@Doda2CO') {
        const newHash = await this.hashPassword(trimmedPassword);
        if (user) {
          user.passwordHash = newHash;
          user.role = 'super_admin';
          user.isActive = true;
          this.saveUsers(users);
        }
      }
    }

    if (!user) {
      return { success: false, message: 'Invalid credentials. User account not found.' };
    }

    if (!user.isActive) {
      return { success: false, message: 'This user account is currently deactivated. Contact Super Admin.' };
    }

    const inputHash = await this.hashPassword(trimmedPassword);
    if (user.passwordHash !== inputHash) {
      return { success: false, message: 'Incorrect password. Please verify and try again.' };
    }

    // Set active session without exposing passwordHash
    const sessionUser: AppUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    };

    this.currentUser = sessionUser;
    safeStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(sessionUser));

    return { success: true, user: sessionUser };
  }

  /**
   * Log out active session
   */
  public logout(): void {
    this.currentUser = null;
    safeStorage.removeItem(AUTH_USER_STORAGE_KEY);
  }

  /**
   * Get current authenticated user
   */
  public getCurrentUser(): AppUser | null {
    if (this.currentUser) return { ...this.currentUser };
    const stored = safeStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
        return this.currentUser ? { ...this.currentUser } : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Check if a session is currently authenticated
   */
  public isAuthenticated(): boolean {
    return Boolean(this.getCurrentUser());
  }
}

export const authService = new AuthService();
