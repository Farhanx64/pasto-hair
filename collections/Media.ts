import { fileURLToPath } from "url";
import path from "path";

import type { CollectionConfig } from "payload";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Uploads are stored in a private, persistent dir (outside public_html on the host).
// Set MEDIA_DIR to an absolute path on cPanel; locally defaults to ./.data/media.
const mediaDir = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR, "media")
    : path.resolve(dirname, "..", ".data", "media");

export const Media: CollectionConfig = {
  slug: "media",
  access: {
    read: () => true,
  },
  upload: {
    staticDir: mediaDir,
    mimeTypes: ["image/*", "video/*"],
  },
  fields: [
    {
      name: "alt",
      type: "text",
    },
  ],
};
