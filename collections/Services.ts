import type { CollectionConfig } from "payload";

export const Services: CollectionConfig = {
  slug: "services",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "price", "durationMinutes", "active", "sortOrder"],
  },
  fields: [
    {
      name: "id",
      type: "text",
      unique: true,
    },
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "price",
      type: "number",
      required: true,
    },
    {
      name: "durationMinutes",
      type: "number",
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
    {
      name: "description",
      type: "textarea",
    },
  ],
};
