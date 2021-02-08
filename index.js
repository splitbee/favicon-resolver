let cache = caches.default

const svgFavicon = 'data:image/svg+xml,'

const defaultIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#4a5568">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>`

async function handleRequest(request) {
  const init = {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
    },
    redirect: 'follow',
  }
  let requestURL = new URL(request.url)

  const url = requestURL.searchParams.get('url')

  const targetURL = new URL(url.startsWith('https') ? url : 'https://' + url)

  let favicon = ''
  const response = await fetch(targetURL.origin, init).catch(() => {
    console.log('failed')
  })

  let newResponse = new HTMLRewriter()
    .on('link[rel*="icon"]', {
      async element(element) {
        if (element.getAttribute('rel') === 'mask-icon' || favicon) return
        favicon = element.getAttribute('href')
        if (favicon.startsWith('/')) {
          const prefix = favicon.startsWith('//') ? 'https:' : targetURL.origin
          favicon = prefix + favicon
        } else if (!favicon.startsWith('http')) {
          favicon = targetURL.origin + '/' + favicon
        }
      },
    })
    .transform(response)

  await newResponse.text()

  if (!favicon) {
    const fav = await fetch(targetURL.origin + '/favicon.ico')
    if (fav.status === 200) {
      const resss = new Response(fav.body, { headers: fav.headers })
      resss.headers.set('Cache-Control', 'max-age=86400')

      return resss
    }

    const defaultIcon = new Response(defaultIconSvg, {
      headers: {
        'content-type': 'image/svg+xml',
      },
    })

    defaultIcon.headers.set('Cache-Control', 'max-age=36000')

    return defaultIcon
  }

  const isRaw = requestURL.searchParams.get('raw')

  if (isRaw !== null) {
    const ic = new Response(favicon)
    ic.headers.set('Cache-Control', 'max-age=86400')
    return ic
  }

  let icon = await fetch(favicon)

  if (favicon.includes(svgFavicon)) {
    return new Response(decodeURI(favicon.split(svgFavicon)[1]), {
      headers: {
        'content-type': 'image/svg+xml',
      },
    })
  }

  const ct = icon.headers.get('content-type')

  if (ct.includes('application') || ct.includes('text')) {
    icon = await fetch(`https://www.google.com/s2/favicons?domain=${url}`)
  }

  const iconRes = new Response(icon.body)

  iconRes.headers.set('Cache-Control', 'max-age=86400')
  iconRes.headers.set('Content-Type', icon.headers.get('content-type'))

  return iconRes
}

addEventListener('fetch', event => {
  return event.respondWith(handleRequest(event.request))
})
