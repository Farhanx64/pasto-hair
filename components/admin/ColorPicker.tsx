"use client";

import { useField } from "@payloadcms/ui";
import { isHexColor } from "@/src/lib/theme";

// Native color picker shown next to a theme color text field. The text field stays
// the source of truth: picking writes a hex value into it, and an empty field shows
// the brand default in the swatch.
export function ColorPicker({ defaultColor }: { defaultColor: string }) {
  const { value, setValue } = useField<string>();
  const color = isHexColor(value) ? value.toLowerCase() : defaultColor;

  return (
    <input
      type="color"
      aria-label="Pick a color"
      value={color}
      onChange={(e) => setValue(e.target.value)}
      style={{
        width: 48,
        height: 40,
        marginTop: 8,
        padding: 2,
        border: "1px solid var(--theme-elevation-150)",
        borderRadius: 4,
        background: "transparent",
        cursor: "pointer",
      }}
    />
  );
}
