import type { Config } from "tailwindcss";
import leasefyBridge from "./tailwind.leasefy";

const config: Config = {
    darkMode: ["class"],
    // @leasefy/ui bridge — DS theme names (surface/fg/ink/text-label/shadow-glow…)
    // resolve here; mvp's own keys below win on collision (same brand values).
    presets: [leasefyBridge as Config],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // design-system components (symlinked package) — Tailwind must see their classes
    "./node_modules/@leasefy/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
  	container: {
  		center: true,
  		padding: {
  			DEFAULT: '1rem',
  			sm: '1.5rem',
  			lg: '2rem',
  		},
  		screens: {
  			'2xl': '1280px',
  		},
  	},
  	extend: {
  		fontFamily: {
  			sans: ['var(--font-sans)'],
  			heading: ['var(--font-heading)'],
  			mono: ['var(--font-mono)'],
  		},
  		// escala @leasefy/ui (BRAND-CONTRACT §3) — reemplaza la escala shadcn
  		// tras el radius sweep (rounded-md→sm, rounded-lg→md, rounded-2xl/3xl→xl).
  		borderRadius: {
  			sm: '6px',
  			md: '8px',
  			lg: '12px',
  			xl: '16px',
  		},
  		zIndex: {
  			dropdown: 'var(--z-dropdown)',
  			sticky: 'var(--z-sticky)',
  			fixed: 'var(--z-fixed)',
  			'modal-backdrop': 'var(--z-modal-backdrop)',
  			modal: 'var(--z-modal)',
  			popover: 'var(--z-popover)',
  			tooltip: 'var(--z-tooltip)',
  			toast: 'var(--z-toast)',
  			max: 'var(--z-max)',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  			'indeterminate': {
  				'0%': { transform: 'translateX(-100%)' },
  				'100%': { transform: 'translateX(400%)' }
  			},
  			'shimmer': {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' }
  			},
  			'fade-in': {
  				from: { opacity: '0' },
  				to: { opacity: '1' }
  			},
  			'fade-in-up': {
  				from: { opacity: '0', transform: 'translateY(10px)' },
  				to: { opacity: '1', transform: 'translateY(0)' }
  			},
  			'scale-in': {
  				from: { opacity: '0', transform: 'scale(0.95)' },
  				to: { opacity: '1', transform: 'scale(1)' }
  			},
  			'slide-in-right': {
  				from: { transform: 'translateX(100%)', opacity: '0.5' },
  				to: { transform: 'translateX(0)', opacity: '1' }
  			},
  			'slide-in-left': {
  				from: { transform: 'translateX(-100%)', opacity: '0.5' },
  				to: { transform: 'translateX(0)', opacity: '1' }
  			},
  			'slide-in-up': {
  				from: { transform: 'translateY(100%)' },
  				to: { transform: 'translateY(0)' }
  			},
  			'slide-in-down': {
  				from: { transform: 'translateY(-100%)' },
  				to: { transform: 'translateY(0)' }
  			},
  			'panel-in': {
  				'0%': { transform: 'translateX(100%) scale(0.98)', opacity: '0' },
  				'60%': { transform: 'translateX(-2%) scale(1.005)', opacity: '1' },
  				'100%': { transform: 'translateX(0) scale(1)', opacity: '1' }
  			},
  			'backdrop-in': {
  				'0%': { opacity: '0', backdropFilter: 'blur(0px)' },
  				'100%': { opacity: '1', backdropFilter: 'blur(4px)' }
  			},
  			'page-in': {
  				'0%': { opacity: '0', transform: 'translateY(12px) scale(0.99)' },
  				'100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
  			},
  			'stagger-in': {
  				'0%': { opacity: '0', transform: 'translateY(6px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' }
  			},
  			'content-reveal': {
  				'0%': { opacity: '0', transform: 'translateX(8px)' },
  				'100%': { opacity: '1', transform: 'translateX(0)' }
  			},
  			'panel-out': {
  				'0%': { transform: 'translateX(0) scale(1)', opacity: '1' },
  				'100%': { transform: 'translateX(100%) scale(0.98)', opacity: '0' }
  			},
  			'backdrop-out': {
  				'0%': { opacity: '1', backdropFilter: 'blur(4px)' },
  				'100%': { opacity: '0', backdropFilter: 'blur(0px)' }
  			},
  			'sweep': {
  				'0%': { transform: 'translateX(-100%)' },
  				'100%': { transform: 'translateX(200%)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'indeterminate': 'indeterminate 1.5s ease-in-out infinite',
  			'shimmer': 'shimmer 2s linear infinite',
  			'sweep': 'sweep 3s ease-in-out infinite',
  			'fade-in': 'fade-in 0.2s ease-out',
  			'fade-in-up': 'fade-in-up 0.3s ease-out',
  			'scale-in': 'scale-in 0.2s ease-out',
  			'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  			'slide-in-left': 'slide-in-left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  			'slide-in-up': 'slide-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  			'slide-in-down': 'slide-in-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  			'panel-in': 'panel-in 0.55s cubic-bezier(0.32, 0.72, 0, 1)',
  			'backdrop-in': 'backdrop-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
  			'page-in': 'page-in 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
  			'stagger-in': 'stagger-in 0.4s cubic-bezier(0.32, 0.72, 0, 1) backwards',
  			'content-reveal': 'content-reveal 0.45s cubic-bezier(0.32, 0.72, 0, 1) backwards',
  			'panel-out': 'panel-out 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards',
  			'backdrop-out': 'backdrop-out 0.3s ease-in forwards'
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
  			/* Extended color scales for product pages */
  			emerald: {
  				50: 'hsl(var(--emerald-50))',
  				100: 'hsl(var(--emerald-100))',
  				200: 'hsl(var(--emerald-200))',
  				300: 'hsl(var(--emerald-300))',
  				400: 'hsl(var(--emerald-400))',
  				500: 'hsl(var(--emerald-500))',
  				600: 'hsl(var(--emerald-600))',
  				700: 'hsl(var(--emerald-700))',
  				800: 'hsl(var(--emerald-800))',
  				900: 'hsl(var(--emerald-900))',
  				950: 'hsl(var(--emerald-950))',
  			},
  			teal: {
  				50: 'hsl(var(--teal-50))',
  				100: 'hsl(var(--teal-100))',
  				200: 'hsl(var(--teal-200))',
  				300: 'hsl(var(--teal-300))',
  				400: 'hsl(var(--teal-400))',
  				500: 'hsl(var(--teal-500))',
  				600: 'hsl(var(--teal-600))',
  				700: 'hsl(var(--teal-700))',
  				800: 'hsl(var(--teal-800))',
  				900: 'hsl(var(--teal-900))',
  				950: 'hsl(var(--teal-950))',
  			},
  			cyan: {
  				50: 'hsl(var(--cyan-50))',
  				100: 'hsl(var(--cyan-100))',
  				200: 'hsl(var(--cyan-200))',
  				300: 'hsl(var(--cyan-300))',
  				400: 'hsl(var(--cyan-400))',
  				500: 'hsl(var(--cyan-500))',
  				600: 'hsl(var(--cyan-600))',
  				700: 'hsl(var(--cyan-700))',
  				800: 'hsl(var(--cyan-800))',
  				900: 'hsl(var(--cyan-900))',
  				950: 'hsl(var(--cyan-950))',
  			},
  			violet: {
  				50: 'hsl(var(--violet-50))',
  				100: 'hsl(var(--violet-100))',
  				200: 'hsl(var(--violet-200))',
  				300: 'hsl(var(--violet-300))',
  				400: 'hsl(var(--violet-400))',
  				500: 'hsl(var(--violet-500))',
  				600: 'hsl(var(--violet-600))',
  				700: 'hsl(var(--violet-700))',
  				800: 'hsl(var(--violet-800))',
  				900: 'hsl(var(--violet-900))',
  				950: 'hsl(var(--violet-950))',
  			},
  			purple: {
  				50: 'hsl(var(--purple-50))',
  				100: 'hsl(var(--purple-100))',
  				200: 'hsl(var(--purple-200))',
  				300: 'hsl(var(--purple-300))',
  				400: 'hsl(var(--purple-400))',
  				500: 'hsl(var(--purple-500))',
  				600: 'hsl(var(--purple-600))',
  				700: 'hsl(var(--purple-700))',
  				800: 'hsl(var(--purple-800))',
  				900: 'hsl(var(--purple-900))',
  				950: 'hsl(var(--purple-950))',
  			},
  			amber: {
  				50: 'hsl(var(--amber-50))',
  				100: 'hsl(var(--amber-100))',
  				200: 'hsl(var(--amber-200))',
  				300: 'hsl(var(--amber-300))',
  				400: 'hsl(var(--amber-400))',
  				500: 'hsl(var(--amber-500))',
  				600: 'hsl(var(--amber-600))',
  				700: 'hsl(var(--amber-700))',
  				800: 'hsl(var(--amber-800))',
  				900: 'hsl(var(--amber-900))',
  				950: 'hsl(var(--amber-950))',
  			},
  			orange: {
  				50: 'hsl(var(--orange-50))',
  				100: 'hsl(var(--orange-100))',
  				200: 'hsl(var(--orange-200))',
  				300: 'hsl(var(--orange-300))',
  				400: 'hsl(var(--orange-400))',
  				500: 'hsl(var(--orange-500))',
  				600: 'hsl(var(--orange-600))',
  				700: 'hsl(var(--orange-700))',
  				800: 'hsl(var(--orange-800))',
  				900: 'hsl(var(--orange-900))',
  				950: 'hsl(var(--orange-950))',
  			},
  			blue: {
  				50: 'hsl(var(--blue-50))',
  				100: 'hsl(var(--blue-100))',
  				200: 'hsl(var(--blue-200))',
  				300: 'hsl(var(--blue-300))',
  				400: 'hsl(var(--blue-400))',
  				500: 'hsl(var(--blue-500))',
  				600: 'hsl(var(--blue-600))',
  				700: 'hsl(var(--blue-700))',
  				800: 'hsl(var(--blue-800))',
  				900: 'hsl(var(--blue-900))',
  				950: 'hsl(var(--blue-950))',
  			},
  			rose: {
  				50: 'hsl(var(--rose-50))',
  				100: 'hsl(var(--rose-100))',
  				200: 'hsl(var(--rose-200))',
  				300: 'hsl(var(--rose-300))',
  				400: 'hsl(var(--rose-400))',
  				500: 'hsl(var(--rose-500))',
  				600: 'hsl(var(--rose-600))',
  				700: 'hsl(var(--rose-700))',
  				800: 'hsl(var(--rose-800))',
  				900: 'hsl(var(--rose-900))',
  				950: 'hsl(var(--rose-950))',
  			},
  			slate: {
  				50: 'hsl(var(--slate-50))',
  				100: 'hsl(var(--slate-100))',
  				200: 'hsl(var(--slate-200))',
  				300: 'hsl(var(--slate-300))',
  				400: 'hsl(var(--slate-400))',
  				500: 'hsl(var(--slate-500))',
  				600: 'hsl(var(--slate-600))',
  				700: 'hsl(var(--slate-700))',
  				800: 'hsl(var(--slate-800))',
  				900: 'hsl(var(--slate-900))',
  				950: 'hsl(var(--slate-950))',
  			},
  			/* Product page dark theme */
  			product: {
  				bg: 'hsl(var(--product-bg))',
  				elevated: 'hsl(var(--product-bg-elevated))',
  				subtle: 'hsl(var(--product-bg-subtle))',
  				border: 'hsl(var(--product-border))',
  				'border-subtle': 'hsl(var(--product-border-subtle))',
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
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
