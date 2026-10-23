// Admin-editable site colors. Each field of the `theme` global overrides one CSS
// custom property from app/globals.css; an empty field keeps the brand default.

export type ThemeColorField = "accent" | "highlight" | "background" | "text";

export type ThemeColors = Partial<Record<ThemeColorField, string | null>>;

// Brand defaults — keep in sync with :root in app/globals.css.
export const THEME_DEFAULTS: Record<ThemeColorField, string> = {
  accent: "#bb86fc",
  highlight: "#e8dcc4",
  background: "#0a0a0c",
  text: "#ededed",
};

// The CSS custom property each field overrides.
export const THEME_CSS_VARS: Record<ThemeColorField, string> = {
  accent: "--accent",
  highlight: "--champagne",
  background: "--background",
  text: "--foreground",
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

// Payload field validator: empty means "use the brand default".
export function validateHexColor(value: string | null | undefined): true | string {
  if (value == null || value === "") return true;
  return isHexColor(value) || "Use a hex color like #bb86fc";
}

// Build the override block injected by the frontend layout. Only strict
// #rrggbb values get through, so admin input can never break out of the rule.
// `html:root` outranks the plain `:root` defaults in globals.css, so the overrides
// win no matter where Next places this <style> relative to the stylesheet.
// Returns "" when nothing is overridden.
export function themeOverridesCss(theme: ThemeColors | null | undefined): string {
  if (!theme) return "";
  const declarations = (Object.keys(THEME_CSS_VARS) as ThemeColorField[])
    .filter((field) => isHexColor(theme[field]))
    .map((field) => `${THEME_CSS_VARS[field]}:${theme[field]!.toLowerCase()};`);
  return declarations.length ? `html:root{${declarations.join("")}}` : "";
}
