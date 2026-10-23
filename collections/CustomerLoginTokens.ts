import type { CollectionConfig } from "payload";

import { adminOnly } from "./Customers";

/**
 * Pending magic-link sign-ins. One row per emailed link, holding only the
 * SHA-256 of the link's token; the row is deleted when the link is used, and
 * expired rows are swept on later requests. Keyed by email rather than a
 * customer relation: the customer record is only created once a link is
 * actually used, so typing someone else's address into the form creates
 * nothing but this short-lived row.
 */
export const CustomerLoginTokens: CollectionConfig = {
  slug: "customer-login-tokens",
  admin: {
    hidden: true,
  },
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: "tokenHash",
      type: "text",
      required: true,
      unique: true,
      index: true,
    },
    {
      name: "email",
      type: "email",
      required: true,
    },
    {
      name: "expiresAt",
      type: "date",
      required: true,
      index: true,
    },
  ],
};
