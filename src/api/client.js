/**
 * dataplatform-service 공통 호출부. 규칙은 IDD '공통규약' 시트를 따른다.
 * dev 서버는 vite.config.js 의 프록시로 같은 오리진(/api)이 된다 — CORS 설정이 필요 없다.
 */

const API_BASE = '/api'

export class ApiError extends Error {
  constructor(message, status, errors = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
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

export async function apiFetch(path, options = {}) {
  let res
  try {
    res = await send(path, options, await getToken())
    /* 토큰 만료(8시간)·서버 재기동으로 서명 키가 바뀐 경우 — 한 번만 새로 받아 다시 보낸다 */
    if (res.status === 401 && import.meta.env.DEV) res = await send(path, options, await getToken({ refresh: true }))
  } catch {
    throw new ApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.', 0)
  }

  const body = await res.json().catch(() => null)
  /* 서버의 실패 응답은 늘 JSON 봉투다 — JSON 이 아닌 5xx 는 dev 프록시가 서버에 붙지 못한 경우다 */
  if (res.status >= 500 && !body) throw new ApiError('서버에 연결할 수 없습니다. 백엔드가 켜져 있는지 확인해 주세요.', res.status)
  if (!res.ok) {
    /* 실패 응답은 언제나 {detail: 문자열} — 그대로 사용자에게 보여줄 수 있는 한국어 문장이다 */
    const message = typeof body?.detail === 'string' ? body.detail : `요청을 처리하지 못했습니다. (${res.status})`
    throw new ApiError(message, res.status, body?.errors ?? null)
  }
  return body
}

/** IF-AUTH-04 */
export function fetchMe() {
  return apiFetch('/me')
}

/* 파일 받기 — 인증 헤더가 필요해 <a href> 로는 못 받는다. fetch 로 받아 Blob 으로 저장한다.
   zip 은 스트리밍이라 도중에 끊기면 200 뒤 본문만 짧아질 수 있어, 받은 길이를 Content-Length 와 맞춰 본다 */
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

  const blob = await res.blob()
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
