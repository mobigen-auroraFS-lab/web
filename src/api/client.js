/**
 * dataplatform-service 공통 호출부. 규칙은 IDD '공통규약' 시트를 따른다.
 * dev 서버는 vite.config.js 의 프록시로 같은 오리진(/api)이 된다 — CORS 설정이 필요 없다.
 */

const API_BASE = '/api'

export class ApiError extends Error {
  constructor(message, status, errors = null, { aborted = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    /* 조건이 바뀌어 화면이 스스로 끊은 요청 — 사용자에게 알릴 오류가 아니다 */
    this.aborted = aborted
  }

  /* 같은 요청을 다시 보내 볼 만한 오류인지 — 연결 실패 · 시간 초과(status 0)와 5xx 만이다.
     400 · 404 · 422 는 다시 보내도 같으므로 「다시 시도」를 보이지 않는다(입력을 고치거나 닫는다) */
  get retryable() {
    return !this.aborted && (this.status === 0 || this.status >= 500)
  }
}

/* 응답을 기다리는 최대 시간 — 넘으면 끊고 늦다고 알린다 */
const REQUEST_TIMEOUT_MS = 30000

/* 서버가 JSON 봉투 없이 실패했을 때(앞단 프록시가 대신 답한 경우)의 문구 */
const GATEWAY_MESSAGES = {
  502: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  503: '서버가 잠시 요청을 받을 수 없습니다. 잠시 후 다시 시도해 주세요.',
  504: '응답이 늦어 중단했습니다. 잠시 후 다시 시도해 주세요.'
}

/* 운영 모드에서 /auth/token 은 404 라, 로그인 화면이 생기기 전까지 토큰은 dev 빌드에서만 받는다 */
let tokenPromise = null

function requestDevToken() {
  return fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((body) => body?.access_token ?? null)
    .catch(() => null)
}

function getToken({ refresh = false } = {}) {
  if (!import.meta.env.DEV) return Promise.resolve(null)
  if (refresh || !tokenPromise) tokenPromise = requestDevToken()
  return tokenPromise
}

/* 배열은 같은 이름을 반복해서 싣는다(topic=a&topic=b) — /file-search·/tags 계열의 규칙.
   빈 값은 아예 빼서 서버 기본값이 적용되게 한다 */
export function toQuery(params = {}) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) value.forEach((v) => q.append(key, v))
    else q.append(key, String(value))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

async function send(path, options, token) {
  const headers = { Accept: 'application/json', ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${API_BASE}${path}`, { ...options, headers })
}

/**
 * options.signal 로 화면이 이전 요청을 끊을 수 있고(조건이 바뀔 때), REQUEST_TIMEOUT_MS 가 지나면 스스로 끊는다.
 * 끊긴 이유에 따라 aborted(조용히 무시) · 시간 초과(다시 시도 가능)로 나눠 던진다.
 */
export async function apiFetch(path, { signal, ...options } = {}) {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)
  const onAbort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  else signal?.addEventListener('abort', onAbort, { once: true })

  let res
  let body
  try {
    const opts = { ...options, signal: controller.signal }
    res = await send(path, opts, await getToken())
    /* 토큰 만료(8시간)·서버 재기동으로 서명 키가 바뀐 경우 — 한 번만 새로 받아 다시 보낸다 */
    if (res.status === 401 && import.meta.env.DEV) res = await send(path, opts, await getToken({ refresh: true }))
    body = await res.json().catch((e) => {
      if (e?.name === 'AbortError') throw e
      return null
    })
  } catch {
    if (timedOut) throw new ApiError('응답이 늦습니다. 잠시 후 다시 시도해 주세요.', 0)
    if (signal?.aborted) throw new ApiError('요청을 취소했습니다.', 0, null, { aborted: true })
    throw new ApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.', 0)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }

  if (!res.ok) {
    /* 실패 응답은 언제나 {detail: 문자열} — 그대로 사용자에게 보여줄 수 있는 한국어 문장이다(IDD 공통규약 · 전달사항 1-6).
       JSON 이 아닌 5xx 는 앞단 프록시가 서버에 붙지 못한 경우라 상태 코드로 문구를 고른다 */
    const message =
      typeof body?.detail === 'string'
        ? body.detail
        : (GATEWAY_MESSAGES[res.status] ??
          (res.status >= 500 ? '서버에 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.' : `요청을 처리하지 못했습니다. (${res.status})`))
    throw new ApiError(message, res.status, body?.errors ?? null)
  }
  return body
}

/** IF-AUTH-04 */
export function fetchMe() {
  return apiFetch('/me')
}

/* 파일 받기 — 단건은 서버가 주는 짧은 수명의 다운로드 링크(IF-ASSET-15)를 브라우저가 직접 열어 받는다(브라우저 다운로드 관리자가
   받으므로 큰 파일도 메모리에 모으지 않고 진행률 · 이어받기가 된다). 묶음 zip 은 링크가 없어 헤더 인증 fetch 로 받아 Blob 으로 저장한다 */
function filenameFrom(res, fallback) {
  const cd = res.headers.get('Content-Disposition') || ''
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd)
  if (star) {
    try {
      return decodeURIComponent(star[1])
    } catch {
      /* 아래 일반 filename 으로 */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(cd)
  return plain ? plain[1] : fallback
}

export async function downloadFile(path, { method = 'GET', body, fallbackName = 'download' } = {}) {
  const options = {
    method,
    headers: { Accept: '*/*', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  }
  let res
  try {
    res = await send(path, options, await getToken())
    if (res.status === 401 && import.meta.env.DEV) res = await send(path, options, await getToken({ refresh: true }))
  } catch {
    throw new ApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.', 0)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null)
    const message = typeof err?.detail === 'string' ? err.detail : `파일을 받지 못했습니다. (${res.status})`
    throw new ApiError(message, res.status, err?.errors ?? null)
  }

  /* zip 은 스트리밍이라 받는 도중 서버가 끊기면 blob() 이 네트워크 오류로 던진다 — 영어 오류 대신 안내 문장으로 바꾼다 */
  let blob
  try {
    blob = await res.blob()
  } catch {
    throw new ApiError('파일을 끝까지 받지 못했습니다. 다시 시도해 주세요.', res.status)
  }
  const expected = Number(res.headers.get('Content-Length'))
  if (expected && blob.size !== expected) throw new ApiError('파일을 끝까지 받지 못했습니다. 다시 시도해 주세요.', res.status)

  const name = filenameFrom(res, fallbackName)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)

  return {
    name,
    /* 일괄 받기에서 노출 대상이 아니거나 원본이 없어 빠진 수 */
    missing: Number(res.headers.get('X-Bundle-Missing')) || 0,
    files: Number(res.headers.get('X-Bundle-Files')) || 0
  }
}

/* 링크로 열기 전 HEAD 로 먼저 확인하는 이유 — 링크를 바로 열었다가 실패하면 브라우저가 JSON 오류 화면으로 이동한다(HEAD 는 본문도 접근 기록도 없다) */
const LINK_ERRORS = {
  404: '다운로드 대상을 찾을 수 없거나 받을 수 없는 자료입니다.',
  410: '원본 파일을 찾을 수 없습니다. 파일이 옮겨졌거나 삭제되었을 수 있습니다.',
  503: '서버가 혼잡하거나 일시적으로 쓸 수 없습니다. 잠시 후 다시 시도해 주세요.'
}

/** IF-ASSET-15 → IF-ASSET-03 — 원본 1건을 다운로드 링크로 받는다. 링크는 5분쯤 뒤 만료되어 누를 때마다 새로 받는다 */
export async function downloadByLink(assetId, fallbackName = 'download') {
  const { url } = await apiFetch(`/assets/${encodeURIComponent(assetId)}/download-link`, { method: 'POST' })
  /* 서버가 준 url 은 서버 기준 경로라 프록시 접두사만 붙인다 */
  const href = `${API_BASE}${url}`

  let head
  try {
    head = await fetch(href, { method: 'HEAD' })
  } catch {
    throw new ApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.', 0)
  }
  if (!head.ok) throw new ApiError(LINK_ERRORS[head.status] ?? `파일을 받지 못했습니다. (${head.status})`, head.status)

  /* 파일 이름은 서버의 Content-Disposition(attachment)이 정한다 */
  const a = document.createElement('a')
  a.href = href
  a.download = ''
  document.body.appendChild(a)
  a.click()
  a.remove()
  return { name: filenameFrom(head, fallbackName) }
}

/* ----------------------------------------------------------- 묶음(zip) 받기 */

/* 묶음도 링크로 받는다(IF-ASSET-16) — 건수 · 용량 상한이 없어 수 GB 도 가능하므로, 브라우저 다운로드 관리자가 받게 하고 메모리에 모으지 않는다.
   링크는 그 요청 대상(경로 + 조건)에만 통하고 곧 만료되므로 누를 때마다 새로 받는다 */
async function mintBundleLink(method, url) {
  const body = await apiFetch('/bundle-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, url })
  })
  return `${API_BASE}${body.url}`
}

const BUNDLE_ERRORS = {
  404: '내려받을 대상을 찾을 수 없습니다.',
  409: '내려받을 수 있는 파일이 없습니다. 원본이 없거나 받을 수 없는 자료입니다.',
  503: '묶음 내려받기가 몰려 있습니다. 잠시 후 다시 시도해 주세요.'
}

/** GET 묶음(관계 · 분류 · 개체 · 카드) — 링크를 열기 전 HEAD 로 확인해 오류를 문장으로 알린다(바로 열었다 실패하면 브라우저가 JSON 화면으로 이동한다).
    HEAD 가 담길 건수 · 용량(X-Bundle-Bytes)을 알려 주므로, confirm 을 주면 받기 전에 물어볼 수 있다 — 거절하면 aborted 오류로 끝낸다 */
export async function downloadBundleByLink(url, { confirm } = {}) {
  const href = await mintBundleLink('GET', url)
  let head
  try {
    head = await fetch(href, { method: 'HEAD' })
  } catch {
    throw new ApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.', 0)
  }
  if (!head.ok) throw new ApiError(BUNDLE_ERRORS[head.status] ?? `묶음을 받지 못했습니다. (${head.status})`, head.status)
  const result = {
    count: Number(head.headers.get('X-Bundle-Count')) || 0,
    missing: Number(head.headers.get('X-Bundle-Missing')) || 0,
    bytes: Number(head.headers.get('X-Bundle-Bytes')) || 0
  }
  /* 링크는 곧 만료되지만(약 5분) 묻는 동안은 충분하다 */
  if (confirm && !(await confirm(result))) throw new ApiError('다운로드를 취소했습니다.', 0, null, { aborted: true })
  const a = document.createElement('a')
  a.href = href
  a.download = ''
  document.body.appendChild(a)
  a.click()
  a.remove()
  return result
}

/** 고른 자산 묶음 — 폼 제출(IF-ASSET-17)로 받는다. 숨은 iframe 으로 제출해 화면은 그대로 두고, 서버가 오류 JSON 을 주면 onError 로 알린다 */
export async function downloadSelectionByForm(ids, { onError } = {}) {
  const href = await mintBundleLink('POST', '/assets/bundle/download')
  const frame = document.createElement('iframe')
  frame.name = `bundle-${Date.now()}`
  frame.style.display = 'none'
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = href
  form.target = frame.name
  form.style.display = 'none'
  ids.forEach((id) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'asset_ids'
    input.value = id
    form.appendChild(input)
  })
  /* 내려받기가 시작되면 load 가 오지 않는다 — load 가 오면 서버가 오류 본문을 준 것이다.
     단, 빈 iframe 은 붙이는 순간 about:blank 로 load 가 한 번 오므로(Chrome) 그건 거른다 */
  frame.addEventListener('load', () => {
    if (frame.contentWindow?.location.href === 'about:blank') return
    try {
      const detail = JSON.parse(frame.contentDocument?.body?.innerText ?? '')?.detail
      onError?.(typeof detail === 'string' ? detail : '묶음을 받지 못했습니다.')
    } catch {
      onError?.('묶음을 받지 못했습니다.')
    }
  })
  document.body.append(frame, form)
  form.submit()
  setTimeout(() => {
    form.remove()
    frame.remove()
  }, 60000)
  return { count: ids.length }
}
