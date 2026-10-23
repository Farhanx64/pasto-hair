import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

// Starter Terms of Service, as a Lexical editor state so it drops straight into
// the `legal` global's rich-text field. scripts/seed.ts writes it when no terms
// are saved yet. It's a starting point for the owner to edit in the admin panel —
// once saved there, the stored copy is what the site shows.

// The cancel cutoff lives in BookingSettings and the terms are free text, so the
// number is baked in when the template is built. Changing the setting later does
// not rewrite saved terms.
export const DEFAULT_CANCEL_CUTOFF_MINUTES = 90;

type Block =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

function describeCutoff(minutes: number): string {
  if (minutes <= 0) return "right up to your start time";
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `up to ${hours} hour${hours === 1 ? "" : "s"} before your appointment`;
  }
  return `up to ${minutes} minutes before your appointment`;
}

function starterBlocks(cancelCutoffMinutes: number): Block[] {
  return [
    {
      kind: "paragraph",
      text: "Thanks for choosing Pasto Hair. These terms cover booking and visiting the shop. By booking an appointment, you agree to them.",
    },

    { kind: "heading", text: "Booking appointments" },
    {
      kind: "list",
      items: [
        "Book online or by phone. Your appointment is confirmed once you receive a confirmation email.",
        "Please give us accurate contact details so we can reach you about your booking.",
        "Each booking is for one person. If you're bringing someone else, book them their own appointment.",
      ],
    },

    { kind: "heading", text: "Cancelling or rescheduling" },
    {
      kind: "list",
      items: [
        `You can cancel online using the link in your confirmation email, ${describeCutoff(cancelCutoffMinutes)}.`,
        "After that, please call the shop and we'll sort it out.",
        "To reschedule, cancel your current appointment and book a new time.",
      ],
    },

    { kind: "heading", text: "Late arrivals and no-shows" },
    {
      kind: "list",
      items: [
        "Running late? Give us a call. We'll fit you in if we can, but we may need to shorten your service or move you to a later time so the next client isn't kept waiting.",
        "If you miss your appointment without letting us know, we may ask you to book by phone in future.",
      ],
    },

    { kind: "heading", text: "Prices and evening rates" },
    {
      kind: "list",
      items: [
        "Current prices are listed on our pricing page. Your booking total is shown before you confirm.",
        "Appointments that start later in the evening carry an evening rate, which is included in your booking total.",
        "Prices may change from time to time. Any extra services added at the chair are charged at the current price.",
      ],
    },

    { kind: "heading", text: "Your service" },
    {
      kind: "list",
      items: [
        "Tell us before your appointment about any allergies, sensitive skin, or scalp conditions.",
        "Chemical services like perms may need a patch test at least 48 hours beforehand. If you haven't had one with us before, call ahead and we'll arrange it.",
        "We may decline or adjust a service if we don't think it's safe for your hair or skin.",
        "Results depend on your hair type and condition. If you're not happy with your service, let us know within 7 days and we'll do our best to put it right.",
      ],
    },

    { kind: "heading", text: "Liability" },
    {
      kind: "paragraph",
      text: "We take care with every service. As far as the law allows, we aren't responsible for reactions to products or treatments when allergies or conditions weren't shared with us, or for personal belongings left at the shop. Nothing in these terms limits any rights you have under the law.",
    },

    { kind: "heading", text: "How we use your contact details" },
    {
      kind: "list",
      items: [
        "We use your name, email, and phone number to manage your appointment: sending your confirmation and cancellation emails, and contacting you about your booking.",
        "Your booking details are kept in our booking system and calendar, and shared only with the services we use to run them (such as email delivery).",
        "We don't sell your information.",
      ],
    },

    { kind: "heading", text: "Changes to these terms" },
    {
      kind: "paragraph",
      text: "We may update these terms from time to time. The version on this page applies to bookings made after the date shown at the top.",
    },

    { kind: "heading", text: "Contact" },
    {
      kind: "paragraph",
      text: "Questions about these terms or your booking? Get in touch using the details on this page and we'll be happy to help.",
    },
  ];
}

// ── Lexical node builders ──
// Shapes match what the admin editor saves, so the starter text edits cleanly.

function textNode(text: string) {
  return { type: "text", text, format: 0, detail: 0, mode: "normal", style: "", version: 1 };
}

function blockNode(block: Block) {
  const base = { direction: "ltr" as const, format: "" as const, indent: 0, version: 1 };
  switch (block.kind) {
    case "heading":
      return { ...base, type: "heading", tag: "h2", children: [textNode(block.text)] };
    case "paragraph":
      return {
        ...base,
        type: "paragraph",
        textFormat: 0,
        textStyle: "",
        children: [textNode(block.text)],
      };
    case "list":
      return {
        ...base,
        type: "list",
        listType: "bullet",
        tag: "ul",
        start: 1,
        children: block.items.map((item, i) => ({
          ...base,
          type: "listitem",
          value: i + 1,
          children: [textNode(item)],
        })),
      };
  }
}

// The index signature matches Payload's generated richText type, so the result
// can be passed straight to payload.updateGlobal.
type TermsEditorState = SerializedEditorState & { [k: string]: unknown };

export function buildStarterTerms(
  cancelCutoffMinutes: number = DEFAULT_CANCEL_CUTOFF_MINUTES,
): TermsEditorState {
  return {
    root: {
      type: "root",
      direction: "ltr",
      format: "",
      indent: 0,
      version: 1,
      children: starterBlocks(cancelCutoffMinutes).map(blockNode),
    },
  } as TermsEditorState;
}
