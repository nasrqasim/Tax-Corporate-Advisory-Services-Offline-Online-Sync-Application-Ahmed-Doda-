import { describe, it, expect, beforeEach } from 'vitest';
import { authService, SUPER_ADMIN_EMAIL } from '../services/auth/authService';
import { safeStorage } from '../services/sqlite/storage';

describe('Super Admin & Administrator Management (RBAC) Security Verification', () => {
  beforeEach(async () => {
    // Reset auth session & test database
    safeStorage.removeItem('tax_crm_auth_user_v1');
    safeStorage.removeItem('tax_crm_registered_users_v1');
    await authService.init();
  });

  it('authenticates initial Super Admin with official credentials', async () => {
    const res = await authService.login(SUPER_ADMIN_EMAIL, 'Arsalan@Crm@32tax');
    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user?.role).toBe('super_admin');
    expect(res.user?.name).toBe('Arslan (Super Admin)');
  });

  it('allows Super Admin to create a new administrator account', async () => {
    const loginRes = await authService.login(SUPER_ADMIN_EMAIL, 'Arsalan@Crm@32tax');
    const superAdminId = loginRes.user!.id;

    const createRes = await authService.createAdministrator(
      {
        name: 'Tariq Mehmood',
        email: 'tariq@arslantax.pk',
        password: 'Password123!',
        role: 'admin'
      },
      superAdminId
    );

    expect(createRes.success).toBe(true);
    expect(createRes.user?.name).toBe('Tariq Mehmood');
    expect(createRes.user?.email).toBe('tariq@arslantax.pk');
    expect(createRes.user?.role).toBe('admin');

    // Verify the new administrator can log in
    authService.logout();
    const adminLogin = await authService.login('tariq@arslantax.pk', 'Password123!');
    expect(adminLogin.success).toBe(true);
    expect(adminLogin.user?.role).toBe('admin');
  });

  it('blocks non-super admin users from creating administrator accounts (RBAC Protection)', async () => {
    const loginRes = await authService.login(SUPER_ADMIN_EMAIL, 'Arsalan@Crm@32tax');
    const superAdminId = loginRes.user!.id;

    // Create a regular admin first
    const createRes = await authService.createAdministrator(
      {
        name: 'Regular Admin',
        email: 'regular@arslantax.pk',
        password: 'SecurePass123!',
        role: 'admin'
      },
      superAdminId
    );
    const regularAdminId = createRes.user!.id;

    // Regular admin attempts to create another admin
    const unauthorizedAttempt = await authService.createAdministrator(
      {
        name: 'Hacker User',
        email: 'hacker@arslantax.pk',
        password: 'BadPassword1!',
        role: 'super_admin'
      },
      regularAdminId
    );

    expect(unauthorizedAttempt.success).toBe(false);
    expect(unauthorizedAttempt.message).toContain('Unauthorized');
  });

  it('allows Super Admin to securely change their own Login ID / Email', async () => {
    const loginRes = await authService.login(SUPER_ADMIN_EMAIL, 'Arsalan@Crm@32tax');
    const superAdminId = loginRes.user!.id;

    // Wrong password verification fails
    const failChange = await authService.changeSuperAdminLoginId(
      superAdminId,
      'WrongPassword!',
      'newsuperadmin@arslantax.pk'
    );
    expect(failChange.success).toBe(false);

    // Correct password succeeds
    const successChange = await authService.changeSuperAdminLoginId(
      superAdminId,
      'Arsalan@Crm@32tax',
      'newsuperadmin@arslantax.pk'
    );
    expect(successChange.success).toBe(true);

    // New login works
    authService.logout();
    const newLoginRes = await authService.login('newsuperadmin@arslantax.pk', 'Arsalan@Crm@32tax');
    expect(newLoginRes.success).toBe(true);
    expect(newLoginRes.user?.email).toBe('newsuperadmin@arslantax.pk');
  });

  it('allows Super Admin to securely change their own password', async () => {
    const loginRes = await authService.login(SUPER_ADMIN_EMAIL, 'Arsalan@Crm@32tax');
    const superAdminId = loginRes.user!.id;

    // Incorrect current password fails
    const failPass = await authService.changeSuperAdminPassword(
      superAdminId,
      'IncorrectCurrentPass',
      'ArslanTaxMaster#2026'
    );
    expect(failPass.success).toBe(false);

    // Correct current password succeeds
    const successPass = await authService.changeSuperAdminPassword(
      superAdminId,
      'Arsalan@Crm@32tax',
      'ArslanTaxMaster#2026'
    );
    expect(successPass.success).toBe(true);

    // Old password is now rejected
    authService.logout();
    const oldLogin = await authService.login(SUPER_ADMIN_EMAIL, 'Arsalan@Crm@32tax');
    expect(oldLogin.success).toBe(false);

    // New password succeeds
    const newLogin = await authService.login(SUPER_ADMIN_EMAIL, 'ArslanTaxMaster#2026');
    expect(newLogin.success).toBe(true);
  });

  it('prevents deleting or deactivating the last Super Admin account', async () => {
    const loginRes = await authService.login(SUPER_ADMIN_EMAIL, 'Arsalan@Crm@32tax');
    const superAdminId = loginRes.user!.id;

    // Attempt to delete self as last Super Admin
    const delRes = await authService.deleteAdministrator(superAdminId, superAdminId);
    expect(delRes.success).toBe(false);

    // Attempt to deactivate self
    const toggleRes = await authService.toggleUserActive(superAdminId, superAdminId);
    expect(toggleRes.success).toBe(false);
  });
});
