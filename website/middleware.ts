import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {

    const headers = new Headers(req.headers);
    headers.set("x-current-path", req.nextUrl.pathname);

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token && req.nextUrl.pathname !== '/signin' && req.nextUrl.pathname !== '/privacy' && req.nextUrl.pathname !== '/static/finalists.pdf' && req.nextUrl.pathname !== '/static/special_events.pdf' && req.nextUrl.pathname !== "/static/candidates.pdf") {
        const signInUrl = new URL('/signin', req.url);
        return NextResponse.redirect(signInUrl);
    }

    if(req.nextUrl.pathname === '/static/finalists.pdf') {
        headers.set(
            'Cache-Control',
            'no-store, max-age=0, must-revalidate, proxy-revalidate'
        );
    }

    return NextResponse.next({ headers });
}

export const config = {
    matcher: '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
}