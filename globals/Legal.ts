import type { GlobalConfig } from "payload";

export const Legal: GlobalConfig = {
  slug: "legal",
  label: "Legal",
  // Public: the /terms page and anyone reading the booking form's terms link.
  access: { read: () => true },
  admin: {
    group: "Settings",
  },
  fields: [
    {
      name: "termsUpdatedAt",
      label: "Terms last updated",
      type: "date",
      admin: {
        description: "Shown at the top of the Terms of Service page. Update it whenever you change the terms.",
        date: { pickerAppearance: "dayOnly", displayFormat: "MMMM d, yyyy" },
      },
    },
    {
      name: "termsBody",
      label: "Terms of Service",
      type: "richText",
      // No defaultValue: the SQLite adapter would turn it into a column DEFAULT,
      // and that breaks schema push (the text's apostrophes aren't escaped).
      // Starter text comes from scripts/seed.ts instead.
      admin: {
        description:
          "Shown at /terms. Customers must agree to these before booking online. Starts as a template — read it through and adjust it to how the shop actually runs.",
      },
    },
  ],
};
