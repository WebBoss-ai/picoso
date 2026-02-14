import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ city: null, area: null });
  }

  try {
    // You can swap this with any geocoding provider
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'trezla-app' } }
    );
    const data = await res.json();

    const city =
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.state_district ||
      null;

    const area =
      data.address?.neighbourhood ||
      data.address?.suburb ||
      data.address?.road ||
      null;

    return NextResponse.json({ city, area });
  } catch (e) {
    return NextResponse.json({ city: null, area: null });
  }
}
