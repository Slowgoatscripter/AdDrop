import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
  			serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
  			playfair: ['var(--font-playfair)', 'Georgia', 'serif'],
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
  			gold: {
  				DEFAULT: 'hsl(var(--gold))',
  				muted: 'hsl(var(--gold-muted))',
  				light: 'hsl(var(--gold-light))',
  				bright: 'hsl(var(--gold-bright))',
  			},
  			sage: 'hsl(var(--sage))',
  			surface: {
  				DEFAULT: 'hsl(var(--surface))',
  				hover: 'hsl(var(--surface-hover))',
  			},
  			cream: 'hsl(var(--cream))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			marquee: {
  				'0%': { transform: 'translateX(0%)' },
  				'100%': { transform: 'translateX(-100%)' },
  			},
  			'pulse-gold': {
  				'0%, 100%': { boxShadow: '0 0 0 0 hsl(var(--gold) / 0.5)' },
  				'50%': { boxShadow: '0 0 0 10px hsl(var(--gold) / 0)' },
  			},
  		},
  		animation: {
  			marquee: 'marquee 30s linear infinite',
  			'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
  		},
  	}
  },
  plugins: [tailwindcssAnimate, typography],
} satisfies Config;
