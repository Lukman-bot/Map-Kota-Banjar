import type { LoaderFunctionArgs } from "react-router";
import { originOf } from "../lib/seo";

export function loader({ request }: LoaderFunctionArgs) {
  const body = ["User-agent: *", "Allow: /", "", `Sitemap: ${originOf(request)}/sitemap.xml`, ""].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
