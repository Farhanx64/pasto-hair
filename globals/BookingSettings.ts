import type { GlobalConfig } from "payload";
import { DEFAULT_EVENING_SURCHARGE_TIERS, DEFAULT_WEEKEND_SURCHARGE } from "../src/lib/booking/pricing";

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
      name: "eveningSurchargeTiers",
      label: "Evening surcharge tiers",
      type: "array",
      defaultValue: DEFAULT_EVENING_SURCHARGE_TIERS.map((t) => ({ ...t })),
      admin: {
        description:
          "Each tier applies to bookings starting at or after its start time. A booking pays only the latest tier it falls into (tiers don't add up). Remove every row to turn the evening surcharge off.",
      },
      fields: [
        {
          name: "start",
          type: "text",
          required: true,
          admin: {
            description: "24-hour HH:MM, e.g. 20:00 for 8 PM",
          },
          validate: (value: string | null | undefined) =>
            /^([01]\d|2[0-3]):[0-5]\d$/.test(value ?? "") ||
            "Use 24-hour HH:MM, e.g. 20:00 for 8 PM",
        },
        {
          name: "amount",
          type: "number",
          required: true,
          min: 0,
          admin: {
            description: "Dollars added to the booking total",
          },
        },
      ],
    },
    {
      name: "weekendSurchargeDays",
      label: "Weekend evening days",
      type: "select",
      hasMany: true,
      defaultValue: [...DEFAULT_WEEKEND_SURCHARGE.days],
      options: [
        { label: "Monday", value: "mon" },
        { label: "Tuesday", value: "tue" },
        { label: "Wednesday", value: "wed" },
        { label: "Thursday", value: "thu" },
        { label: "Friday", value: "fri" },
        { label: "Saturday", value: "sat" },
        { label: "Sunday", value: "sun" },
      ],
      admin: {
        description:
          "On these days every evening surcharge tier is multiplied by the weekend multiplier below. Leave empty to charge weekends the same as weekdays.",
      },
    },
    {
      name: "weekendSurchargeMultiplier",
      label: "Weekend evening multiplier",
      type: "number",
      defaultValue: DEFAULT_WEEKEND_SURCHARGE.multiplier,
      min: 1,
      admin: {
        description: "2 = double (e.g. +$10 becomes +$20). 1 = no weekend increase.",
      },
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
    {
      name: "cancelCutoffMinutes",
      type: "number",
      defaultValue: 90,
      admin: {
        description:
          "How close to the appointment a customer may still cancel themselves via the link in their confirmation email. Inside this window the link tells them to call instead. 0 = allow cancelling right up to the start time.",
      },
    },
  ],
};
