import { describe, it, expect } from 'vitest';
import { syncEngine } from '../services/sync/supabaseSync';

describe('Supabase Online Database & Cloud Storage Integration', () => {
  it('initializes Supabase engine with provided official credentials', () => {
    const config = syncEngine.getConfig();
    expect(config.url).toBe('https://zoqtihnzebrxqarnvfap.supabase.co');
    expect(config.anonKey).toBe('sb_publishable_Dwug5kQkqpZMh-Cvv2hZ_w_8MHU9yGp');
    expect(config.isConfigured).toBe(true);
  });

  it('verifies cloud connection and storage bucket readiness', async () => {
    const testRes = await syncEngine.testConnection();
    expect(testRes.success).toBe(true);
    expect(testRes.storageConnected).toBe(true);
    expect(testRes.url).toBe('https://zoqtihnzebrxqarnvfap.supabase.co');
  }, 15000);

  it('supports document storage token creation', async () => {
    const res = await syncEngine.uploadPrivateDocument('sample_cnic.enc', 'dGVzdC1kYXRh', 'CUST-2026-0001');
    expect(res.storageRef).toBeTruthy();
    expect(res.downloadToken).toBeTruthy();
  }, 15000);
});
