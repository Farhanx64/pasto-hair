import type { Access, CollectionConfig } from "payload";

// Admin (Payload `users`) only, for every operation. Customers never touch this
// collection through Payload's REST/GraphQL API — they are not Payload auth
// users; the site's own /api/account routes read and write it server-side
// with the local API. Spelled out rather than left to Payload's default so a
// future `read: () => true` copy-paste from Services can't slip in unnoticed:
// this is the one collection that is a list of every customer's email.
export const adminOnly: Access = ({ req }) => Boolean(req.user);

export const Customers: CollectionConfig = {
  slug: "customers",
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "name", "phone", "lastLoginAt", "createdAt"],
    group: "Accounts",
    description:
      "Customers who have signed in on the site with an emailed link. There are no passwords. Bookings are matched to an account by email.",
  },
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    beforeDelete: [
      // Deleting a customer signs them out everywhere. Before, not after: a
      // session's customer is required, so the row can't outlive its customer.
      async ({ id, req }) => {
        await req.payload.delete({
          collection: "customer-sessions",
          where: { customer: { equals: id } },
          req,
        });
      },
    ],
  },
  fields: [
    {
      name: "email",
      type: "email",
      required: true,
      unique: true,
      index: true,
      hooks: {
        // The account key — stored lowercased so "Jane@x.com" and "jane@x.com"
        // are one customer, not two.
        beforeValidate: [({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value)],
      },
    },
    {
      name: "name",
      type: "text",
    },
    {
      name: "phone",
      type: "text",
    },
    {
      name: "lastLoginAt",
      type: "date",
      admin: {
        readOnly: true,
        date: { pickerAppearance: "dayAndTime" },
      },
    },
  ],
};
