import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const CANONICAL_HOST = "wagadu-africa.org";
const NON_CANONICAL_HOSTS = ["wagadu-africa.com", "wagadu-africa.net"];

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0];

  if (host && NON_CANONICAL_HOSTS.includes(host)) {
    const url = new URL(request.url);
    url.host = CANONICAL_HOST;
    url.protocol = "https";
    return NextResponse.redirect(url, 308);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
