import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['var(--font-sans)'],
  			heading: ['var(--font-heading)'],
  			mono: ['var(--font-mono)'],
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			/* ── New design system scales ── */
  			indigo: {
  				50: 'hsl(var(--indigo-50))',
  				100: 'hsl(var(--indigo-100))',
  				200: 'hsl(var(--indigo-200))',
  				300: 'hsl(var(--indigo-300))',
  				400: 'hsl(var(--indigo-400))',
  				500: 'hsl(var(--indigo-500))',
  				600: 'hsl(var(--indigo-600))',
  				700: 'hsl(var(--indigo-700))',
  				800: 'hsl(var(--indigo-800))',
  				900: 'hsl(var(--indigo-900))',
  				950: 'hsl(var(--indigo-950))',
  			},
  			sand: {
  				50: 'hsl(var(--sand-50))',
  				100: 'hsl(var(--sand-100))',
  				200: 'hsl(var(--sand-200))',
  				300: 'hsl(var(--sand-300))',
  				400: 'hsl(var(--sand-400))',
  				500: 'hsl(var(--sand-500))',
  				600: 'hsl(var(--sand-600))',
  				700: 'hsl(var(--sand-700))',
  				800: 'hsl(var(--sand-800))',
  				900: 'hsl(var(--sand-900))',
  			},
  			neutral: {
  				0: 'hsl(var(--neutral-0))',
  				50: 'hsl(var(--neutral-50))',
  				100: 'hsl(var(--neutral-100))',
  				200: 'hsl(var(--neutral-200))',
  				300: 'hsl(var(--neutral-300))',
  				400: 'hsl(var(--neutral-400))',
  				500: 'hsl(var(--neutral-500))',
  				600: 'hsl(var(--neutral-600))',
  				700: 'hsl(var(--neutral-700))',
  				800: 'hsl(var(--neutral-800))',
  				900: 'hsl(var(--neutral-900))',
  			},
  			success: {
  				50: 'hsl(var(--success-50))',
  				100: 'hsl(var(--success-100))',
  				500: 'hsl(var(--success-500))',
  				700: 'hsl(var(--success-700))',
  			},
  			warning: {
  				50: 'hsl(var(--warning-50))',
  				100: 'hsl(var(--warning-100))',
  				500: 'hsl(var(--warning-500))',
  				700: 'hsl(var(--warning-700))',
  			},
  			error: {
  				50: 'hsl(var(--error-50))',
  				100: 'hsl(var(--error-100))',
  				500: 'hsl(var(--error-500))',
  				700: 'hsl(var(--error-700))',
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			risk: {
  				a: 'hsl(var(--risk-a))',
  				b: 'hsl(var(--risk-b))',
  				c: 'hsl(var(--risk-c))',
  				d: 'hsl(var(--risk-d))'
  			},
  			plan: {
  				page: 'var(--plan-page-bg)',
  				card: 'var(--plan-card-bg)',
  				accent: {
  					DEFAULT: 'var(--plan-accent)',
  					dark: 'var(--plan-accent-dark)'
  				},
  				border: 'var(--plan-border)',
  				primary: 'var(--plan-text-primary)',
  				secondary: 'var(--plan-text-secondary)',
  				muted: 'var(--plan-text-muted)',
  				status: {
  					green: {
  						DEFAULT: 'var(--plan-status-green)',
  						bg: 'var(--plan-status-green-bg)'
  					},
  					yellow: {
  						DEFAULT: 'var(--plan-status-yellow)',
  						bg: 'var(--plan-status-yellow-bg)'
  					},
  					red: {
  						DEFAULT: 'var(--plan-status-red)',
  						bg: 'var(--plan-status-red-bg)'
  					},
  					purple: {
  						DEFAULT: 'var(--plan-status-purple)',
  						bg: 'var(--plan-status-purple-bg)'
  					},
  					blue: {
  						DEFAULT: 'var(--plan-status-blue)',
  						bg: 'var(--plan-status-blue-bg)'
  					}
  				}
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
