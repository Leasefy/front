import { describe, expect, it } from 'vitest';
import { insercionDelVideo, portadaDeYoutube, redDelEnlace, videoDelInmueble, videoInvalido } from './video';

describe('redDelEnlace (espejo del back)', () => {
  it.each([
    ['https://www.instagram.com/reel/C1a2b3c4d5e/', 'instagram'],
    ['https://vm.tiktok.com/ZMabc123/', 'tiktok'],
    ['https://youtu.be/dQw4w9WgXcQ', 'youtube'],
    ['https://www.youtube.com/shorts/abc', 'youtube'],
    ['https://fb.watch/abc123/', 'facebook'],
  ])('%s → %s', (url, red) => {
    expect(redDelEnlace(url)).toBe(red);
  });

  it.each(['http://www.instagram.com/reel/x/', 'https://instagram.com.estafa.co/x', 'https://vimeo.com/1', 'instagram.com/reel/x', ''])(
    'rechaza %s',
    (url) => {
      expect(redDelEnlace(url)).toBeNull();
    },
  );
});

describe('videoDelInmueble', () => {
  it('sin enlace no hay video', () => {
    expect(videoDelInmueble({})).toBeNull();
    expect(videoDelInmueble({ videoUrl: null })).toBeNull();
  });

  it('un enlace que no es de una red no se pinta', () => {
    expect(videoDelInmueble({ videoUrl: 'https://ejemplo.com/video' })).toBeNull();
  });

  it('un reel de Instagram', () => {
    expect(videoDelInmueble({ videoUrl: ' https://www.instagram.com/reel/abc/ ' })).toEqual({
      url: 'https://www.instagram.com/reel/abc/',
      red: 'instagram',
    });
  });
});

describe('videoInvalido (el campo del video en los formularios)', () => {
  it('vacío no es inválido: el video es opcional', () => {
    expect(videoInvalido('')).toBe(false);
    expect(videoInvalido('   ')).toBe(false);
    expect(videoInvalido(undefined)).toBe(false);
  });

  it('un enlace de las cuatro redes sirve; otra cosa no', () => {
    expect(videoInvalido('https://www.instagram.com/reel/abc/')).toBe(false);
    expect(videoInvalido('https://drive.google.com/x')).toBe(true);
    expect(videoInvalido(`https://www.instagram.com/${'a'.repeat(500)}`)).toBe(true);
  });
});

describe('insercionDelVideo (el reproductor oficial de cada red, dentro de Leasefy)', () => {
  it.each([
    ['https://www.youtube.com/watch?v=YpMt97uAkHo', 'https://www.youtube-nocookie.com/embed/YpMt97uAkHo', false],
    ['https://youtu.be/YpMt97uAkHo?t=3', 'https://www.youtube-nocookie.com/embed/YpMt97uAkHo', false],
    ['https://www.youtube.com/shorts/YpMt97uAkHo', 'https://www.youtube-nocookie.com/embed/YpMt97uAkHo', true],
    ['https://www.tiktok.com/@nogal/video/7400000000000000001', 'https://www.tiktok.com/player/v1/7400000000000000001', true],
    ['https://www.instagram.com/reel/C9abc_12/', 'https://www.instagram.com/reel/C9abc_12/embed/', true],
    ['https://www.instagram.com/p/C9abc12/', 'https://www.instagram.com/p/C9abc12/embed/', true],
  ])('%s', (enlace, empieza, vertical) => {
    const r = insercionDelVideo(enlace)!;
    expect(r.src.startsWith(empieza)).toBe(true);
    expect(r.vertical).toBe(vertical);
  });

  it('Facebook va por su plugin con el enlace entero', () => {
    const r = insercionDelVideo('https://www.facebook.com/nogal/videos/123/')!;
    expect(r.src).toContain('facebook.com/plugins/video.php?href=');
    expect(r.src).toContain(encodeURIComponent('https://www.facebook.com/nogal/videos/123/'));
  });

  it('sin decir qué video es (enlace corto de TikTok, un perfil) no se inserta: se abre en la red', () => {
    expect(insercionDelVideo('https://vm.tiktok.com/ZMabc123/')).toBeNull();
    expect(insercionDelVideo('https://www.instagram.com/nogal.inmobiliaria/')).toBeNull();
    expect(insercionDelVideo('https://www.youtube.com/@nogal')).toBeNull();
    expect(insercionDelVideo('https://vimeo.com/1')).toBeNull();
  });

  it('la portada de YouTube sale del id; las demás redes no dan una sin permiso', () => {
    expect(portadaDeYoutube('https://youtu.be/YpMt97uAkHo')).toBe('https://i.ytimg.com/vi/YpMt97uAkHo/hq720.jpg');
    expect(portadaDeYoutube('https://www.instagram.com/reel/C9abc12/')).toBeNull();
  });
});
