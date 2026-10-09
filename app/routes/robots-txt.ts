import type { Route } from "./+types/robots-txt";
import { getSiteUrl } from "~/lib/site.server";

export function loader({ request }: Route.LoaderArgs) {
  const siteUrl = getSiteUrl(request);

  const body = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
