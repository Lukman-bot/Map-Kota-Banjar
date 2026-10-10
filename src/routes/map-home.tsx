import type { ClientLoaderFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { mapMeta } from "../lib/map-seo";
import { originOf } from "../lib/seo";

export const loader = ({ request }: LoaderFunctionArgs) => ({ origin: originOf(request) });
// Di browser, data dihitung lokal → pindah wilayah tidak menunggu jaringan.
export const clientLoader = ({ request }: ClientLoaderFunctionArgs) => ({ origin: originOf(request) });

export const meta: MetaFunction<typeof loader> = ({ data }) => mapMeta(data?.origin ?? "", { type: "none" });

/**
 * WAJIB ada default export. Tanpa komponen, React Router menganggap route ini "resource route"
 * dan menjawab permintaan halaman dengan JSON mentah dari loader. Peta sendiri dirender oleh map-layout.tsx.
 */
export default function MapRoute() {
  return null;
}
