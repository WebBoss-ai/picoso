import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ city: null, area: null });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept': 'application/json', 'User-Agent': 'picoso-app' }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return NextResponse.json({ city: null, area: null });
    const data = await res.json();

    const city =
      data.address?.city || data.address?.town || data.address?.village ||
      data.address?.state_district || null;
    const area =
      data.address?.neighbourhood || data.address?.suburb || data.address?.road || null;

    return NextResponse.json({ city, area });
  } catch {
    return NextResponse.json({ city: null, area: null });
  }
}
