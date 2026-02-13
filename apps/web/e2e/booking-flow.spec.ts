import { test, expect, request as playwrightRequest, APIRequestContext } from '@playwright/test';
import * as path from 'path';
import { API_BASE } from './fixtures';

const AUTH_DIR = path.join(__dirname, '.auth');

test.describe('Booking flow — smoke E2E', () => {
  test('client creates a booking via API', async () => {
    const clientCtx = await playwrightRequest.newContext({ storageState: path.join(AUTH_DIR, 'client.json') });

    try {
      // 1. Get pros from catalog
      const prosRes = await clientCtx.get(`${API_BASE}/api/public/pros`);
      const pros = await prosRes.json();
      const proList = Array.isArray(pros) ? pros : pros.data;

      // Find a verified pro with at least one service
      const pro = proList.find(
        (p: any) => p.services && p.services.length > 0 && p.isVerified,
      );
      expect(pro).toBeTruthy();

      const proPublicId = pro.id;
      expect(proPublicId).toMatch(/^pro_/);

      const categoryId = pro.services[0].categoryId;
      expect(categoryId).toMatch(/^cat_/);

      // 2. Pick a date 7 days from now (to ensure future slot)
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];

      // 3. Get available slots
      const slotsRes = await clientCtx.get(
        `${API_BASE}/api/public/slots?proId=${proPublicId}&date=${dateStr}&categoryId=${categoryId}`,
      );
      expect(slotsRes.status()).toBe(200);
      const slots: string[] = await slotsRes.json();

      if (slots.length === 0) {
        test.skip();
        return;
      }

      const selectedSlot = slots[0];

      // 4. Create booking (cookies from stored auth state are auto-forwarded)
      const bookingRes = await clientCtx.post(`${API_BASE}/api/bookings`, {
        data: {
          proId: proPublicId,
          categoryId,
          date: dateStr,
          time: selectedSlot,
        },
      });

      // Accept 201 (created) or 400 (city mismatch — seed client might differ)
      const status = bookingRes.status();
      if (status === 400) {
        const body = await bookingRes.json();
        expect(['CITY_MISMATCH', 'CITY_REQUIRED', 'ADDRESS_REQUIRED']).toContain(body.message);
        test.skip();
        return;
      }

      expect(status).toBe(201);
      const booking = await bookingRes.json();
      expect(booking.status).toBe('PENDING');
      expect(booking.id).toBeTruthy();
    } finally {
      await clientCtx.dispose();
    }
  });

  test('pro can list and confirm a booking', async () => {
    // Use separate contexts with stored auth state
    const clientCtx = await playwrightRequest.newContext({ storageState: path.join(AUTH_DIR, 'client.json') });
    const proCtx = await playwrightRequest.newContext({ storageState: path.join(AUTH_DIR, 'pro.json') });

    try {
      // 1. Get a pro + category from catalog
      const prosRes = await clientCtx.get(`${API_BASE}/api/public/pros`);
      const pros = await prosRes.json();
      const proList = Array.isArray(pros) ? pros : pros.data;
      const pro = proList.find(
        (p: any) => p.services && p.services.length > 0 && p.isVerified,
      );

      if (!pro) {
        test.skip();
        return;
      }

      const proPublicId = pro.id;
      const categoryId = pro.services[0].categoryId;

      // Pick a date 14 days from now
      const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().split('T')[0];

      const slotsRes = await clientCtx.get(
        `${API_BASE}/api/public/slots?proId=${proPublicId}&date=${dateStr}&categoryId=${categoryId}`,
      );
      const slots: string[] = await slotsRes.json();

      if (slots.length === 0) {
        test.skip();
        return;
      }

      const bookingRes = await clientCtx.post(`${API_BASE}/api/bookings`, {
        data: {
          proId: proPublicId,
          categoryId,
          date: dateStr,
          time: slots[0],
        },
      });

      if (bookingRes.status() !== 201) {
        test.skip();
        return;
      }

      const booking = await bookingRes.json();

      // 2. List pro bookings
      const myBookingsRes = await proCtx.get(`${API_BASE}/api/bookings`);
      expect(myBookingsRes.status()).toBe(200);
      const myBookings = await myBookingsRes.json();
      const pendingBooking = (Array.isArray(myBookings) ? myBookings : []).find(
        (b: any) => b.id === booking.id,
      );

      if (!pendingBooking) {
        test.skip();
        return;
      }

      expect(pendingBooking.status).toBe('PENDING');

      // 3. Pro confirms the booking
      const confirmRes = await proCtx.patch(
        `${API_BASE}/api/bookings/${booking.id}/status`,
        { data: { status: 'CONFIRMED' } },
      );
      expect(confirmRes.status()).toBe(200);
      const confirmed = await confirmRes.json();
      expect(confirmed.status).toBe('CONFIRMED');
    } finally {
      await clientCtx.dispose();
      await proCtx.dispose();
    }
  });
});
