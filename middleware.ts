import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  try {
    const url = request.nextUrl.clone()
    const isAuthRoute = url.pathname.startsWith('/connexion') ||
                        url.pathname.startsWith('/inscription') ||
                        url.pathname.startsWith('/mot-de-passe-oublie')
    const isAppRoute = url.pathname.startsWith('/tableau-de-bord') ||
                       url.pathname.startsWith('/projets') ||
                       url.pathname.startsWith('/portefeuille') ||
                       url.pathname.startsWith('/parametres')

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      if (isAppRoute) {
        url.pathname = '/connexion'
        return NextResponse.redirect(url)
      }
      return NextResponse.next({ request })
    }

    let response = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user && isAppRoute) {
      url.pathname = '/connexion'
      return NextResponse.redirect(url)
    }

    if (user && isAuthRoute) {
      url.pathname = '/tableau-de-bord'
      return NextResponse.redirect(url)
    }

    return response
  } catch (e) {
    console.error('Middleware error:', e)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
