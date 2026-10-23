import type { GlobalConfig, TextField } from "payload";
import { THEME_DEFAULTS, validateHexColor, type ThemeColorField } from "../src/lib/theme";

function colorField(name: ThemeColorField, label: string, usedFor: string): TextField {
  const brandDefault = THEME_DEFAULTS[name];
  return {
    name,
    label,
    type: "text",
    validate: validateHexColor,
    admin: {
      placeholder: brandDefault,
      description: `${usedFor} Hex color like ${brandDefault}. Leave empty to use the brand default (${brandDefault}) — clearing the field resets it.`,
      components: {
        afterInput: [
          {
            path: "/components/admin/ColorPicker#ColorPicker",
            clientProps: { defaultColor: brandDefault },
          },
        ],
      },
    },
  };
}

export const Theme: GlobalConfig = {
  slug: "theme",
  label: "Theme colors",
  access: { read: () => true },
  admin: {
    group: "Settings",
    description:
      "Site colors. Changes show on the website on the next page load. Emails keep the brand colors.",
  },
  fields: [
    colorField("accent", "Accent", "Violet accent: buttons, links, icons, focus rings and glows."),
    colorField("highlight", "Highlight", "Champagne highlight: prices, eyebrow labels, card accents."),
    colorField("background", "Background", "Page background and the dark overlays on the nav, footer and photos."),
    colorField("text", "Text", "Main text color for headings and body copy."),
  ],
};
