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
  			sans: [
  				'var(--font-inter)'
  			]
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
