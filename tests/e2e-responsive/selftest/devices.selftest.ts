import { expect, test } from '@playwright/test';

import { iphoneEngine, iphoneId } from '../support/devices';

test('iPhone engine defaults to webkit and only switches on RESPONSIVE_IPHONE_ENGINE=chromium', () => {
  const saved = process.env.RESPONSIVE_IPHONE_ENGINE;
  try {
    delete process.env.RESPONSIVE_IPHONE_ENGINE;
    expect(iphoneEngine()).toBe('webkit');
    process.env.RESPONSIVE_IPHONE_ENGINE = 'firefox';
    expect(iphoneEngine()).toBe('webkit');
    process.env.RESPONSIVE_IPHONE_ENGINE = ' Chromium ';
    expect(iphoneEngine()).toBe('chromium');
  } finally {
    if (saved === undefined) delete process.env.RESPONSIVE_IPHONE_ENGINE;
    else process.env.RESPONSIVE_IPHONE_ENGINE = saved;
  }
});

test('project ids spell out the engine only when it is not the default', () => {
  expect(iphoneId('iPhone 11 414x896', 'webkit')).toBe('iPhone 11 414x896');
  expect(iphoneId('iPhone 11 414x896', 'chromium')).toBe('iPhone 11 414x896 [chromium]');
});
