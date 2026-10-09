import { isRouteErrorResponse, Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

/** Ditampilkan di panel samping (peta tetap terlihat) saat wilayah tidak ada. */
export function WilayahError({ error }: { error: unknown }) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <h1 className="text-xl font-semibold">
          {notFound ? "Wilayah tidak ditemukan" : "Terjadi kesalahan"}
        </h1>
      </CardHeader>
      <CardContent className="space-y-3 px-4 text-sm text-muted-foreground">
        <p>
          {notFound
            ? "Desa/kecamatan yang Anda cari tidak ada di peta Kota Banjar."
            : "Halaman ini gagal dimuat. Silakan coba lagi."}
        </p>
        <Button asChild size="sm">
          <Link to="/" preventScrollReset>
            Kembali ke peta
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
