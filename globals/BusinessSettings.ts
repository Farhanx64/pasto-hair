import type { GlobalConfig } from "payload";

export const BusinessSettings: GlobalConfig = {
  slug: "business-settings",
  admin: {
    group: "Settings",
  },
  fields: [
    {
      name: "businessName",
      type: "text",
    },
    {
      name: "tagline",
      type: "text",
    },
    {
      name: "timezone",
      type: "text",
      defaultValue: "America/New_York",
    },
    {
      name: "address",
      type: "text",
    },
    {
      name: "phone",
      type: "text",
    },
    {
      name: "email",
      type: "email",
    },
    {
      name: "instagramUrl",
      type: "text",
    },
    {
      name: "facebookUrl",
      type: "text",
    },
    {
      name: "twitterUrl",
      type: "text",
    },
    {
      name: "bookingUrl",
      type: "text",
    },
  ],
};
