import type { CollectionConfig } from "payload";

export const Staff: CollectionConfig = {
  slug: "staff",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "role", "calendarId", "active"],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "email",
      type: "email",
    },
    {
      name: "calendarId",
      type: "text",
      required: true,
      admin: {
        description: "Google Calendar ID for this staff member",
      },
    },
    {
      name: "role",
      type: "select",
      options: [
        { label: "Owner", value: "owner" },
        { label: "Barber", value: "barber" },
      ],
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "bio",
      type: "textarea",
    },
  ],
};
