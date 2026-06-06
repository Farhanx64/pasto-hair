import type { CollectionConfig } from "payload";

export const Addons: CollectionConfig = {
  slug: "addons",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "price", "durationMinutes", "active"],
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
      name: "description",
      type: "textarea",
    },
  ],
};
