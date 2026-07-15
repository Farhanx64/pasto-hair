import type { GlobalConfig } from "payload";

export const BookingSettings: GlobalConfig = {
  slug: "booking-settings",
  access: { read: () => true },
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
      name: "multiServiceDiscountEnabled",
      type: "checkbox",
      defaultValue: true,
      admin: {
        description:
          "Toggles the multi-service stack-and-save discount. When on, bookings with 2 or more services receive a percentage off the service subtotal (before any evening surcharge).",
      },
    },
    {
      name: "discountTier2Percent",
      type: "number",
      defaultValue: 10,
      admin: {
        description: "Percent off when a booking has exactly 2 services (1 primary + 1 add-on).",
      },
    },
    {
      name: "discountTier3Percent",
      type: "number",
      defaultValue: 15,
      admin: {
        description: "Percent off when a booking has 3 or more services.",
      },
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
