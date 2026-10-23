import type { CollectionConfig } from "payload";

import { adminOnly } from "./Customers";

/**
 * Server-side customer sessions. The browser holds a random session id in an
 * httpOnly cookie; this row holds only its SHA-256, so the table can't be used
 * to sign anyone in. Deleting a row signs that browser out.
 */
export const CustomerSessions: CollectionConfig = {
  slug: "customer-sessions",
  admin: {
    useAsTitle: "customer",
    defaultColumns: ["customer", "expiresAt", "createdAt"],
    group: "Accounts",
    description: "Signed-in customer browsers. Delete a row to sign that browser out.",
  },
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: "sessionHash",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true, hidden: true },
    },
    {
      name: "customer",
      type: "relationship",
      relationTo: "customers",
      required: true,
      index: true,
    },
    {
      name: "expiresAt",
      type: "date",
      required: true,
      index: true,
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
  ],
};
