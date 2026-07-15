import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Leasefy - Arrienda sin estres';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px',
          background: 'linear-gradient(135deg, #0f0f1a 0%, #121230 40%, #1A40FF 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles for depth */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-80px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(91,95,239,0.35) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-160px',
            left: '200px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(91,95,239,0.2) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #1A40FF 0%, #8A9CFF 50%, #1A40FF 100%)',
            display: 'flex',
          }}
        />

        {/* Brand name */}
        <div
          style={{
            fontSize: 86,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-2px',
            lineHeight: 1,
            display: 'flex',
            marginBottom: '24px',
          }}
        >
          Leasefy
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 42,
            fontWeight: 600,
            color: '#8A9CFF',
            lineHeight: 1.2,
            display: 'flex',
            marginBottom: '16px',
          }}
        >
          Arrienda sin estres
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.4,
            display: 'flex',
          }}
        >
          Administracion de arriendos en Colombia
        </div>

        {/* Bottom decorative element */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '80px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '4px',
              background: '#1A40FF',
              borderRadius: '2px',
              display: 'flex',
            }}
          />
          <div
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '3px',
              textTransform: 'uppercase' as const,
              display: 'flex',
            }}
          >
            leasefy.co
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
