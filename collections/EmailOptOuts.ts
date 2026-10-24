import type { CollectionConfig } from "payload";

import { normalizeEmail } from "../src/lib/marketing/unsubscribe";

/**
 * People who asked not to get promo emails. scripts/send-promo-email.ts skips
 * every address here. Filled by the unsubscribe link in promo emails; add
 * someone by hand when they reply "unsubscribe".
 *
 * Booking confirmations and sign-in emails still go out — those aren't promos.
 */
export const EmailOptOuts: CollectionConfig = {
  slug: "email-opt-outs",
  labels: { singular: "Unsubscribed email", plural: "Unsubscribed emails" },
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "source", "createdAt"],
    description: "These people won't get promo emails. Delete a row to let them back in.",
  },
  access: {
    // Admin-only: the list is customer emails. The public unsubscribe route
    // writes through the local API instead.
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: "email",
      type: "email",
      required: true,
      unique: true,
      index: true,
      hooks: {
        beforeValidate: [({ value }) => (typeof value === "string" ? normalizeEmail(value) : value)],
      },
    },
    {
      name: "source",
      type: "select",
      defaultValue: "manual",
      options: [
        { label: "Unsubscribe link", value: "link" },
        { label: "Added by hand (e.g. replied \"unsubscribe\")", value: "manual" },
      ],
    },
  ],
};
