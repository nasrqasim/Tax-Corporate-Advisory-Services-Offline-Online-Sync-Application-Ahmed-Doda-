import { describe, it, expect } from 'vitest';
import { authService, SUPER_ADMIN_EMAIL } from '../services/auth/authService';

describe('Authentication & Password Security', () => {
  it('authenticates Super Admin with email and new password Arsalan@Crm@32tax', async () => {
    const res = await authService.login(SUPER_ADMIN_EMAIL, 'Arsalan@Crm@32tax');
    expect(res.success).toBe(true);
    expect(res.user).toBeTruthy();
    expect(res.user?.email).toBe('arsalantaxcrm@gmail.com');
    expect(res.user?.role).toBe('super_admin');
  });

  it('rejects incorrect passwords', async () => {
    const res = await authService.login(SUPER_ADMIN_EMAIL, 'WrongPassword999');
    expect(res.success).toBe(false);
    expect(res.user).toBeUndefined();
  });
});
