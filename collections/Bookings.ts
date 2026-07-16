import type { CollectionConfig } from "payload";

export const Bookings: CollectionConfig = {
  slug: "bookings",
  admin: {
    useAsTitle: "customerName",
    defaultColumns: ["customerName", "service", "localDate", "localStartTime", "status"],
  },
  fields: [
    {
      name: "submissionId",
      type: "text",
      unique: true,
      required: true,
    },
    {
      name: "cancelToken",
      type: "text",
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description:
          "Random server-generated token behind the customer's cancel link. Unguessable on purpose — the booking id is not, and a guessable link would let anyone cancel anyone's appointment.",
      },
    },
    {
      name: "status",
      type: "select",
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Confirmed", value: "confirmed" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Failed", value: "failed" },
      ],
    },
    {
      name: "customerName",
      type: "text",
      required: true,
    },
    {
      name: "customerEmail",
      type: "email",
      required: true,
    },
    {
      name: "customerPhone",
      type: "text",
      required: true,
    },
    {
      name: "service",
      type: "text",
      required: true,
    },
    {
      name: "addons",
      type: "array",
      fields: [
        {
          name: "addon",
          type: "text",
        },
      ],
    },
    {
      name: "notes",
      type: "textarea",
    },
    {
      name: "localDate",
      type: "text",
      required: true,
      admin: {
        description: "Date in YYYY-MM-DD format",
      },
    },
    {
      name: "localStartTime",
      type: "text",
      required: true,
      admin: {
        description: "Start time in HH:MM format",
      },
    },
    {
      name: "localEndTime",
      type: "text",
      required: true,
      admin: {
        description: "End time in HH:MM format",
      },
    },
    {
      name: "timeZone",
      type: "text",
      defaultValue: "America/New_York",
    },
    {
      name: "totalPrice",
      type: "number",
      required: true,
    },
    {
      name: "discountPercent",
      type: "number",
      admin: {
        description: "Multi-service discount percent applied to this booking (0 if none).",
      },
    },
    {
      name: "discountAmount",
      type: "number",
      admin: {
        description: "Dollar amount discounted from the service subtotal for this booking.",
      },
    },
    {
      name: "eveningSurcharge",
      type: "checkbox",
    },
    {
      name: "calendarEventId",
      type: "text",
    },
  ],
};
