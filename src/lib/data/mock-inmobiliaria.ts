/**
 * Mock data for the Inmobiliaria (Real Estate Agency) module
 * Comprehensive data for portfolio management, agents, owners, and collections
 *
 * Split into domain files for maintainability — this barrel re-exports everything
 * so existing consumers continue to work unchanged.
 */

export * from './mock-inmobiliaria-core';
export * from './mock-inmobiliaria-operations';
export * from './mock-inmobiliaria-reports';
export * from './mock-inmobiliaria-settings';
export * from './mock-inmobiliaria-documents';
export * from './mock-inmobiliaria-analytics';
