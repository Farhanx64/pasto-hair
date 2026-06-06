import type { CollectionConfig } from "payload";

export const BlockedDates: CollectionConfig = {
  slug: "blocked-dates",
  admin: {
    useAsTitle: "date",
    defaultColumns: ["date", "reason"],
  },
  fields: [
    {
      name: "date",
      type: "text",
      required: true,
      admin: {
        description: "Date in YYYY-MM-DD format",
      },
    },
    {
      name: "reason",
      type: "text",
    },
  ],
};
