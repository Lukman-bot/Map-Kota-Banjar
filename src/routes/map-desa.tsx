import type { ClientLoaderFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { mapMeta } from "../lib/map-seo";
import { originOf } from "../lib/seo";
import { desaById } from "../utils/stats";

function resolve({ request, params }: LoaderFunctionArgs | ClientLoaderFunctionArgs) {
  const id = params.id ?? "";
  if (!desaById.has(id)) throw new Response("Desa/kelurahan tidak ditemukan", { status: 404 }); // status 404 sungguhan
  return { origin: originOf(request), id };
}

export const loader = (args: LoaderFunctionArgs) => resolve(args);
export const clientLoader = (args: ClientLoaderFunctionArgs) => resolve(args);

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  data ? mapMeta(data.origin, { type: "desa", id: data.id }) : [];

/**
 * WAJIB ada default export. Tanpa komponen, React Router menganggap route ini "resource route"
 * dan menjawab permintaan halaman dengan JSON mentah dari loader. Peta sendiri dirender oleh map-layout.tsx.
 */
export default function MapRoute() {
  return null;
}
