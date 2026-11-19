import { NextResponse } from 'next/server';

export async function GET() {
  const apiUrl = 'http://127.0.0.1:3001/public/kits/43cdfc5a-dae8-4124-b4ef-8fef638e1801';
  console.log('[TestAPI] Fetching from:', apiUrl);
  
  try {
    const res = await fetch(apiUrl, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    console.log('[TestAPI] Response status:', res.status);
    
    if (!res.ok) {
      const text = await res.text();
      console.error('[TestAPI] Error response:', text);
      return NextResponse.json({ error: 'API error', status: res.status, details: text }, { status: 500 });
    }
    
    const data = await res.json();
    console.log('[TestAPI] Success:', data.name);
    return NextResponse.json({ success: true, kit: data.name });
  } catch (err) {
    console.error('[TestAPI] Error:', err);
    return NextResponse.json({ error: 'Fetch failed', details: String(err) }, { status: 500 });
  }
}