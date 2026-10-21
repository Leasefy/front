import { devices, type PlaywrightTestOptions, type PlaywrightWorkerOptions } from '@playwright/test';

/** `screen` is a valid context option that Playwright's own device descriptors carry but its `use` typings omit. */
export type DeviceUse = Partial<PlaywrightTestOptions & PlaywrightWorkerOptions> & {
  screen?: { width: number; height: number };
};

export interface DeviceSpec {
  /** Project name (also shown in reports). */
  id: string;
  group: 'mobile' | 'desktop';
  width: number;
  height: number;
  /** Included in the FAST subset (used while fixing). */
  fast?: boolean;
  /** Playwright `use` options for the project. */
  use: DeviceUse;
}

/** Metadata attached to every project so tests know what they are running on. */
export interface DeviceMeta {
  id: string;
  group: 'mobile' | 'desktop';
  width: number;
  height: number;
  /** Treated as "phone-like": tap-target and mobile-navigation checks apply. */
  touch: boolean;
}

// Viewports below are the sizes of the approved matrix and are used as the layout
// viewport (browser chrome is NOT subtracted). Real phones show less than that
// (URL bar, toolbars), so 100vh-type bugs are, if anything, under-reported here.

function iphone(
  id: string,
  width: number,
  height: number,
  dpr: number,
  fast = false,
): DeviceSpec {
  const base = devices['iPhone 14'];
  return {
    id,
    group: 'mobile',
    width,
    height,
    fast,
    use: {
      ...base,
      browserName: 'webkit',
      viewport: { width, height },
      screen: { width, height },
      deviceScaleFactor: dpr,
      isMobile: true,
      hasTouch: true,
    },
  };
}

function android(
  id: string,
  width: number,
  height: number,
  dpr: number,
  fast = false,
): DeviceSpec {
  const base = devices['Pixel 7'];
  return {
    id,
    group: 'mobile',
    width,
    height,
    fast,
    use: {
      ...base,
      browserName: 'chromium',
      viewport: { width, height },
      screen: { width, height },
      deviceScaleFactor: dpr,
      isMobile: true,
      hasTouch: true,
    },
  };
}

function landscape(id: string, descriptor: string): DeviceSpec {
  const d = devices[descriptor];
  return {
    id,
    group: 'mobile',
    width: d.viewport.width,
    height: d.viewport.height,
    use: { ...d },
  };
}

type DesktopBrowser = 'chrome' | 'edge' | 'firefox' | 'webkit';

function desktop(
  browser: DesktopBrowser,
  width: number,
  height: number,
  fast = false,
): DeviceSpec {
  const descriptor = {
    chrome: 'Desktop Chrome',
    edge: 'Desktop Edge',
    firefox: 'Desktop Firefox',
    webkit: 'Desktop Safari',
  }[browser];
  const label = { chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox', webkit: 'WebKit' }[browser];
  return {
    id: `Desktop ${label} ${width}x${height}`,
    group: 'desktop',
    width,
    height,
    fast,
    use: {
      ...devices[descriptor],
      viewport: { width, height },
      screen: { width, height },
      deviceScaleFactor: 1,
    },
  };
}

export const DEVICES: DeviceSpec[] = [
  // iPhones (WebKit)
  iphone('iPhone 11 414x896', 414, 896, 2, true),
  iphone('iPhone 12-13 mini 375x812', 375, 812, 3),
  iphone('iPhone 12-13-14 390x844', 390, 844, 3, true),
  iphone('iPhone 14 Pro-15-16 393x852', 393, 852, 3),
  iphone('iPhone 16 Pro 402x874', 402, 874, 3),
  iphone('iPhone 15 Pro Max-16 Plus 430x932', 430, 932, 3),
  iphone('iPhone 16 Pro Max 440x956', 440, 956, 3),
  // Android (Chromium mobile)
  android('Pixel 7-8 412x915', 412, 915, 2.625, true),
  android('Galaxy S23-S24 360x780', 360, 780, 3, true),
  android('Galaxy A 384x854', 384, 854, 2.8125),
  android('Android small 360x640', 360, 640, 2),
  android('Galaxy Z Fold open 673x841', 673, 841, 2.625),
  // Landscape
  landscape('iPhone 13 landscape', 'iPhone 13 landscape'),
  landscape('Pixel 7 landscape', 'Pixel 7 landscape'),
  // Desktop
  desktop('chrome', 1280, 720),
  desktop('edge', 1280, 720),
  desktop('firefox', 1280, 720),
  desktop('webkit', 1280, 720),
  desktop('chrome', 1366, 768, true),
  desktop('edge', 1366, 768),
  desktop('firefox', 1366, 768),
  desktop('chrome', 1536, 864),
  desktop('edge', 1536, 864),
  desktop('chrome', 1440, 900),
  desktop('webkit', 1440, 900),
  desktop('chrome', 1920, 1080),
  desktop('firefox', 1920, 1080),
];

export function metaFor(device: DeviceSpec): DeviceMeta {
  return {
    id: device.id,
    group: device.group,
    width: device.width,
    height: device.height,
    touch: device.group === 'mobile',
  };
}
