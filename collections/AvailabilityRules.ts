import type { CollectionConfig } from "payload";

export const AvailabilityRules: CollectionConfig = {
  slug: "availability-rules",
  admin: {
    useAsTitle: "day",
    defaultColumns: ["day", "enabled"],
  },
  fields: [
    {
      name: "day",
      type: "select",
      required: true,
      options: [
        { label: "Sunday", value: "sunday" },
        { label: "Monday", value: "monday" },
        { label: "Tuesday", value: "tuesday" },
        { label: "Wednesday", value: "wednesday" },
        { label: "Thursday", value: "thursday" },
        { label: "Friday", value: "friday" },
        { label: "Saturday", value: "saturday" },
      ],
    },
    {
      name: "enabled",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "shifts",
      type: "array",
      fields: [
        {
          name: "start",
          type: "text",
          admin: {
            description: "Start time in HH:MM format",
          },
        },
        {
          name: "end",
          type: "text",
          admin: {
            description: "End time in HH:MM format",
          },
        },
      ],
    },
  ],
};
