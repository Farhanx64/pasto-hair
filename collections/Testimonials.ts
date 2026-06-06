import type { CollectionConfig } from "payload";

export const Testimonials: CollectionConfig = {
  slug: "testimonials",
  admin: {
    useAsTitle: "customerName",
    defaultColumns: ["customerName", "active", "sortOrder"],
  },
  fields: [
    {
      name: "customerName",
      type: "text",
      required: true,
    },
    {
      name: "quote",
      type: "textarea",
      required: true,
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "sortOrder",
      type: "number",
    },
  ],
};
