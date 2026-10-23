import type { CollectionConfig } from "payload";

export const Bookings: CollectionConfig = {
  slug: "bookings",
  admin: {
    useAsTitle: "customerName",
    defaultColumns: ["customerName", "service", "localDate", "localStartTime", "status"],
  },
  hooks: {
    afterChange: [
      // A cancelled booking gives its promo use back, whether it was cancelled
      // from the email link or in the admin. Local API with `req` (not the raw
      // SQL in promo-usage.ts) so the write joins this update's transaction.
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== "update" || !doc.promoCode) return doc;
        if (previousDoc?.status === "cancelled" || doc.status !== "cancelled") return doc;
        const found = await req.payload.find({
          collection: "promo-codes",
          where: { code: { equals: doc.promoCode } },
          limit: 1,
          depth: 0,
          req,
        });
        const promo = found.docs[0];
        if (promo && (promo.timesUsed ?? 0) > 0) {
          await req.payload.update({
            collection: "promo-codes",
            id: promo.id,
            data: { timesUsed: (promo.timesUsed ?? 0) - 1 },
            req,
          });
        }
        return doc;
      },
    ],
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
      name: "promoCode",
      type: "text",
      admin: {
        description: "Promo code applied to this booking, if any.",
      },
    },
    {
      name: "promoDiscountAmount",
      type: "number",
      admin: {
        description: "Dollar amount the promo code took off the services (after the multi-service discount).",
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
    {
      name: "termsAcceptedAt",
      type: "date",
      admin: {
        readOnly: true,
        date: { pickerAppearance: "dayAndTime" },
        description:
          "When the customer ticked \"I agree to the Terms of Service\" on the booking form. Empty for bookings made before the checkbox existed.",
      },
    },
  ],
};
