import type { GlobalConfig } from "payload";

export const BookingSettings: GlobalConfig = {
  slug: "booking-settings",
  admin: {
    group: "Settings",
  },
  fields: [
    {
      name: "slotIntervalMinutes",
      type: "number",
      defaultValue: 15,
    },
    {
      name: "eveningSurchargeStart",
      type: "text",
      defaultValue: "20:00",
      admin: {
        description: "Time in HH:MM format when evening surcharge begins",
      },
    },
    {
      name: "eveningSurchargeAmount",
      type: "number",
      defaultValue: 10,
    },
    {
      name: "failBehavior",
      type: "select",
      defaultValue: "closed",
      options: [
        { label: "Open (allow booking when calendar unreachable)", value: "open" },
        { label: "Closed (block booking when calendar unreachable)", value: "closed" },
      ],
    },
    {
      name: "minLeadTimeMinutes",
      type: "number",
      defaultValue: 0,
    },
    {
      name: "maxBookingWindowDays",
      type: "number",
      defaultValue: 90,
    },
  ],
};
