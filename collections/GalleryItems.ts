import type { CollectionConfig } from "payload";

export const GalleryItems: CollectionConfig = {
  slug: "gallery-items",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "type", "active", "sortOrder"],
  },
  fields: [
    {
      name: "title",
      type: "text",
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "caption",
      type: "text",
    },
    {
      name: "styleTags",
      type: "array",
      fields: [
        {
          name: "tag",
          type: "text",
        },
      ],
    },
    {
      name: "type",
      type: "select",
      options: [
        { label: "Single", value: "single" },
        { label: "Before/After", value: "before-after" },
      ],
    },
    {
      name: "sortOrder",
      type: "number",
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
    },
  ],
};
