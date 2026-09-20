import type { Config } from "tailwindcss";

/**
 * Light SaaS, adopted from the QuoteKit template: near-white ground, white
 * cards, hairline grey borders, indigo primary with a pale indigo accent for
 * icon tiles and active nav. DM Sans for body, Plus Jakarta Sans for headings.
 *
 * Token names carry over from the previous dark system so component classes
 * stay put. Two that changed meaning back:
 *   cream = the page ground (near-white again)
 *   ink   = foreground text (dark again), so `border-ink/10` is a grey hairline
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Indigo primary. 50–200 are pale fills, 400–600 carry text and solids.
        brand: {
          50: "#EEF1FD",
          100: "#E0E6FB",
          200: "#C4CEF6",
          300: "#9AAAEF",
          400: "#7185E5",
          500: "#5468DC",
          600: "#3F5BD9", // primary — hsl(230 65% 52%)
          700: "#3349B5",
          800: "#2A3C93",
          900: "#243373",
        },
        sky: { DEFAULT: "#3F5BD9", soft: "#EEF1FD" },
        // Success / affirmative — hsl(142 71% 45%).
        mint: { DEFAULT: "#22C55E", deep: "#16A34A", faint: "#ECFDF3" },
        // Warning — hsl(38 92% 50%).
        highlight: { DEFAULT: "#F59E0B", soft: "#FEF6E7" },
        // AI-metric accent, kept distinct from the indigo primary.
        plum: { DEFAULT: "#8B5CF6", soft: "#F3EEFE" },
        // Destructive — hsl(0 72% 51%).
        oxblood: { DEFAULT: "#DC2626", soft: "#FEECEC" },

        cream: { DEFAULT: "#F8FAFC", deep: "#F1F5F9" },
        ink: { DEFAULT: "#13182B", soft: "#6B7280", faint: "#9AA1AE" },
        surface: { DEFAULT: "#FFFFFF", sunken: "#F8FAFC" },
        // Reserved: nothing references these now, kept so a dark theme can be
        // reintroduced without re-deriving the ramp.
        night: { DEFAULT: "#0F1421", raised: "#171C2C", line: "#2A3142" },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: { pill: "9999px", xl2: "8px", xl3: "12px" },
      boxShadow: {
        soft: "0 1px 2px rgba(19,24,43,.04), 0 1px 3px rgba(19,24,43,.06)",
        lift: "0 10px 30px -12px rgba(19,24,43,.18), 0 2px 8px rgba(19,24,43,.04)",
        glow: "0 8px 24px -10px rgba(63,91,217,.45)",
        "glow-sm": "0 4px 14px -6px rgba(63,91,217,.35)",
      },
      spacing: { "4.5": "1.125rem", "13": "3.25rem", "18": "4.5rem" },
      letterSpacing: { academic: ".14em" },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "none" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "pulse-ring": {
          "0%": { transform: "scale(.9)", opacity: "0.6" },
          "70%": { transform: "scale(1.5)", opacity: "0" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up .4s ease-out both",
        "pulse-ring": "pulse-ring 2s cubic-bezier(.24,.12,.26,1) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
