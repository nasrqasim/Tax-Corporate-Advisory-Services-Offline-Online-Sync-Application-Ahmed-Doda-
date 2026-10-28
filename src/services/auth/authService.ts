/**
 * Authentication and User Management Service
 * Supports offline-first authentication, salted SHA-256 password hashing,
 * Super Admin idempotent seeding, and role-based permissions.
 */

import { AppUser, CreateAdminInput, UserRole } from '../../types/settings';
import { computeSha256 } from '../security/crypto';
import { safeStorage } from '../sqlite/storage';

const AUTH_USER_STORAGE_KEY = 'tax_crm_auth_user_v1';
const USERS_STORAGE_KEY = 'tax_crm_registered_users_v1';
const PASSWORD_SALT = 'arslan_tax_crm_2026_salt_914836';

// Super Admin initial configuration
export const SUPER_ADMIN_EMAIL = 'arsalantaxcrm@gmail.com';
const INITIAL_SUPER_ADMIN_PASS = 'Arsalan@Crm@32tax';

class AuthService {
  private currentUser: AppUser | null = null;
  private isInitialized = false;

  public async init(forceRefresh = false): Promise<void> {
    if (this.isInitialized && !forceRefresh) {
      const raw = safeStorage.getItem(USERS_STORAGE_KEY);
      if (!raw || raw === '[]') {
        await this.ensureSuperAdminAccount();
      }
      return;
    }

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
   * and automatically migrates legacy credentials.
   */
  private async ensureSuperAdminAccount(): Promise<void> {
    const users = this.getAllUsers();
    const normalizedEmail = SUPER_ADMIN_EMAIL.trim().toLowerCase();
    const targetHash = await this.hashPassword(INITIAL_SUPER_ADMIN_PASS);

    // Look for super admin by new email, old email, or super admin id
    let admin = users.find(
      (u) =>
        (u.email && u.email.trim().toLowerCase() === normalizedEmail) ||
        (u.email && u.email.trim().toLowerCase() === 'ahmeddodataxcrm@gmail.com') ||
        u.id === 'usr-super-admin'
    );

    if (!admin) {
      const superAdmin: AppUser = {
        id: 'usr-super-admin',
        name: 'Arslan (Super Admin)',
        email: normalizedEmail,
        role: 'super_admin',
        passwordHash: targetHash,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      users.unshift(superAdmin);
      this.saveUsers(users);
    } else {
      admin.name = 'Arslan (Super Admin)';
      // Migrate legacy default email
      if (!admin.email || admin.email.trim().toLowerCase() === 'ahmeddodataxcrm@gmail.com') {
        admin.email = normalizedEmail;
      }
      admin.role = 'super_admin';
      admin.isActive = true;
      // Set initial password hash only if not set yet
      if (!admin.passwordHash) {
        admin.passwordHash = targetHash;
      }
      this.saveUsers(users);

      // Update active session if currently logged in as Super Admin
      if (this.currentUser && (this.currentUser.id === admin.id || this.currentUser.role === 'super_admin')) {
        this.currentUser.email = normalizedEmail;
        this.currentUser.name = admin.name;
        safeStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(this.currentUser));
      }
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

  /**
   * Safe user list without password hashes for frontend display
   */
  public getUsersSafe(): Omit<AppUser, 'passwordHash'>[] {
    return this.getAllUsers().map(({ passwordHash, pinHash, ...safe }) => safe);
  }

  private saveUsers(users: AppUser[]): void {
    safeStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  /**
   * Create an administrator account (Restricted to Super Admin)
   */
  public async createAdministrator(
    input: CreateAdminInput,
    requesterId: string
  ): Promise<{ success: boolean; user?: Omit<AppUser, 'passwordHash'>; message?: string }> {
    await this.init();

    const users = this.getAllUsers();
    const requester = users.find((u) => u.id === requesterId);
    if (!requester || requester.role !== 'super_admin') {
      return { success: false, message: 'Unauthorized: Only the Super Admin can create administrators.' };
    }

    const trimmedName = (input.name || '').trim();
    const normalizedEmail = (input.email || '').trim().toLowerCase();
    const trimmedPass = (input.password || '').trim();

    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, message: 'Administrator name must be at least 2 characters.' };
    }

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: false, message: 'Please provide a valid login ID or email address.' };
    }

    if (!trimmedPass || trimmedPass.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    const emailExists = users.some(
      (u) => u.email && u.email.trim().toLowerCase() === normalizedEmail
    );
    if (emailExists) {
      return { success: false, message: 'A user with this login ID / email already exists.' };
    }

    const passwordHash = await this.hashPassword(trimmedPass);
    const newAdmin: AppUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
      email: normalizedEmail,
      role: input.role || 'admin',
      passwordHash,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    users.push(newAdmin);
    this.saveUsers(users);

    const { passwordHash: _, pinHash: __, ...safeUser } = newAdmin;
    return { success: true, user: safeUser, message: 'Administrator created successfully!' };
  }

  /**
   * Change Super Admin Login ID securely
   */
  public async changeSuperAdminLoginId(
    userId: string,
    currentPasswordVerify: string,
    newLoginId: string
  ): Promise<{ success: boolean; message: string }> {
    await this.init();

    const users = this.getAllUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, message: 'User account not found.' };
    }

    if (user.role !== 'super_admin') {
      return { success: false, message: 'Unauthorized: Only Super Admin can perform this action.' };
    }

    const currentHash = await this.hashPassword((currentPasswordVerify || '').trim());
    if (user.passwordHash !== currentHash) {
      return { success: false, message: 'Incorrect current password. Verification failed.' };
    }

    const normalizedNewId = (newLoginId || '').trim().toLowerCase();
    if (!normalizedNewId || normalizedNewId.length < 3) {
      return { success: false, message: 'New Login ID / Email must be at least 3 characters.' };
    }

    const exists = users.some(
      (u) => u.id !== userId && u.email && u.email.trim().toLowerCase() === normalizedNewId
    );
    if (exists) {
      return { success: false, message: 'This Login ID / Email is already in use by another user.' };
    }

    user.email = normalizedNewId;
    this.saveUsers(users);

    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser.email = normalizedNewId;
      safeStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(this.currentUser));
    }

    return { success: true, message: 'Login ID / Email updated successfully!' };
  }

  /**
   * Change Super Admin Password securely
   */
  public async changeSuperAdminPassword(
    userId: string,
    currentPasswordVerify: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    await this.init();

    const users = this.getAllUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, message: 'User account not found.' };
    }

    const currentHash = await this.hashPassword((currentPasswordVerify || '').trim());
    if (user.passwordHash !== currentHash) {
      return { success: false, message: 'Current password verification failed. Please check password.' };
    }

    const trimmedNewPass = (newPassword || '').trim();
    if (!trimmedNewPass || trimmedNewPass.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters long.' };
    }

    user.passwordHash = await this.hashPassword(trimmedNewPass);
    this.saveUsers(users);

    return { success: true, message: 'Password changed successfully!' };
  }

  /**
   * Delete an administrator (Restricted to Super Admin, cannot delete last Super Admin)
   */
  public async deleteAdministrator(
    targetUserId: string,
    requesterId: string
  ): Promise<{ success: boolean; message: string }> {
    await this.init();

    const users = this.getAllUsers();
    const requester = users.find((u) => u.id === requesterId);
    if (!requester || requester.role !== 'super_admin') {
      return { success: false, message: 'Unauthorized: Only Super Admin can delete administrators.' };
    }

    const targetUser = users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return { success: false, message: 'Target user not found.' };
    }

    if (targetUser.role === 'super_admin') {
      const superAdminCount = users.filter((u) => u.role === 'super_admin' && u.isActive).length;
      if (superAdminCount <= 1) {
        return { success: false, message: 'Cannot delete the last Super Admin account.' };
      }
    }

    if (targetUser.id === requesterId) {
      return { success: false, message: 'You cannot delete your own active Super Admin account.' };
    }

    const updatedUsers = users.filter((u) => u.id !== targetUserId);
    this.saveUsers(updatedUsers);

    return { success: true, message: 'Administrator deleted successfully.' };
  }

  /**
   * Toggle administrator status (Active / Inactive)
   */
  public async toggleUserActive(
    targetUserId: string,
    requesterId: string
  ): Promise<{ success: boolean; message: string }> {
    await this.init();

    const users = this.getAllUsers();
    const requester = users.find((u) => u.id === requesterId);
    if (!requester || requester.role !== 'super_admin') {
      return { success: false, message: 'Unauthorized: Only Super Admin can modify administrator status.' };
    }

    const targetUser = users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return { success: false, message: 'Target user not found.' };
    }

    if (targetUser.id === requesterId) {
      return { success: false, message: 'You cannot deactivate your own Super Admin account.' };
    }

    targetUser.isActive = !targetUser.isActive;
    this.saveUsers(users);

    return {
      success: true,
      message: `User ${targetUser.name} has been ${targetUser.isActive ? 'activated' : 'deactivated'}.`
    };
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

    // If Super Admin account does not exist yet or legacy email used, ensure seeded/migrated
    if (
      normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase() ||
      normalizedEmail === 'ahmeddodataxcrm@gmail.com'
    ) {
      await this.ensureSuperAdminAccount();
    }

    const users = this.getAllUsers();
    let user = users.find((u) => u.email && u.email.trim().toLowerCase() === normalizedEmail);

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
