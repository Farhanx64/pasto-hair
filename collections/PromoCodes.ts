import type { CollectionConfig } from "payload";

import { normalizePromoCode } from "../src/lib/booking/promo";

export const PromoCodes: CollectionConfig = {
  slug: "promo-codes",
  admin: {
    useAsTitle: "code",
    defaultColumns: ["code", "type", "value", "active", "timesUsed", "expiresAt"],
  },
  access: {
    // Admin-only for every operation, read included. Unlike services/addons this
    // must NOT be publicly readable, or anyone could list every code via
    // /api/promo-codes. The booking form checks one code at a time through
    // /api/promo instead.
    read: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: "code",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        description: "What customers type at checkout. Not case-sensitive — saved in capitals.",
      },
      hooks: {
        beforeValidate: [({ value }) => normalizePromoCode(value) || value],
      },
    },
    {
      name: "type",
      type: "select",
      required: true,
      defaultValue: "percent",
      options: [
        { label: "Percent off", value: "percent" },
        { label: "Dollars off", value: "fixed" },
      ],
    },
    {
      name: "value",
      type: "number",
      required: true,
      min: 0,
      admin: {
        description:
          "Percent (e.g. 10 for 10% off) or dollars (e.g. 5 for $5 off). Comes off the services after any multi-service discount — never off the evening surcharge.",
      },
      validate: (value: number | null | undefined, { siblingData }: { siblingData: { type?: string } }) => {
        if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
          return "Enter an amount greater than 0";
        }
        if (siblingData?.type === "percent" && value > 100) {
          return "A percent discount can't be more than 100";
        }
        return true;
      },
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "startsAt",
      label: "Starts at",
      type: "date",
      admin: {
        date: { pickerAppearance: "dayAndTime" },
        description: "Optional. Leave empty to start immediately.",
      },
    },
    {
      name: "expiresAt",
      label: "Expires at",
      type: "date",
      admin: {
        date: { pickerAppearance: "dayAndTime" },
        description: "Optional. Leave empty for no expiry.",
      },
    },
    {
      name: "maxUses",
      label: "Max uses",
      type: "number",
      min: 1,
      admin: {
        description: "Optional. Leave empty for unlimited uses.",
      },
    },
    {
      name: "timesUsed",
      label: "Times used",
      type: "number",
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: "Bookings made with this code. Counted automatically.",
      },
    },
    {
      name: "note",
      label: "Internal note",
      type: "textarea",
      admin: {
        description: "Only visible here, e.g. who the code was made for.",
      },
    },
  ],
};
