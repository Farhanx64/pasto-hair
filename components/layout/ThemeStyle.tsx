import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { themeOverridesCss } from "@/src/lib/theme";

// Injects the admin's theme color overrides (Settings → Theme colors) on top of the
// brand defaults in globals.css. Renders nothing when no color is overridden.
export async function ThemeStyle() {
  // Read the theme on every request, so color changes show without a rebuild.
  await connection();
  let css = "";
  try {
    const payload = await getPayload({ config });
    css = themeOverridesCss(await payload.findGlobal({ slug: "theme" }));
  } catch (err) {
    console.error("[theme] Could not load theme colors, using brand defaults:", err);
  }
  if (!css) return null;
  // Safe to inline: themeOverridesCss only lets strict #rrggbb values through.
  return <style id="theme-overrides" dangerouslySetInnerHTML={{ __html: css }} />;
}
