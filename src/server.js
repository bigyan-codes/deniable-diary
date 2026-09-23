import http from 'node:http'
import { randomBytes } from 'node:crypto'
import {
  createDiaryBatch,
  getDiary,
  hasPassword,
  setupPassword,
  verifyPassword
} from './diary.js'

const PORT = 3000

const sessions = new Map()

function createSession(password) {
  const token = randomBytes(32).toString('hex')
  sessions.set(token, password)
  return token
}

function getSessionPassword(req) {
  const cookie = req.headers.cookie || ''
  const match = cookie.match(/session=([^;]+)/)

  if (!match) return null

  return sessions.get(match[1]) || null
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json'
  })
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', chunk => {
      body += chunk

      if (body.length > 1000000) {
        reject(new Error('Request too large.'))
        req.destroy()
      }
    })

    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error('Invalid request.'))
      }
    })

    req.on('error', reject)
  })
}

const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Deniable Diary</title>

<style>
* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  background: #f5f3ef;
  color: #292724;
}

.container {
  max-width: 850px;
  margin: auto;
  padding: 40px 20px 80px;
}

header {
  text-align: center;
  margin-bottom: 35px;
}

h1 {
  font-size: 42px;
  margin: 0 0 8px;
}

.subtitle {
  color: #777;
}

.card {
  background: white;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,.06);
  margin-bottom: 22px;
}

textarea,
input {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 16px;
  font: inherit;
  font-size: 16px;
}

textarea {
  min-height: 180px;
  resize: vertical;
}

button {
  margin-top: 14px;
  border: 0;
  border-radius: 10px;
  padding: 13px 22px;
  font-size: 16px;
  cursor: pointer;
  background: #292724;
  color: white;
}

button:disabled {
  opacity: .5;
  cursor: wait;
}

.status {
  margin-top: 15px;
  color: #666;
  min-height: 24px;
}

.entry {
  border: 1px solid #e5e2dd;
  border-radius: 14px;
  padding: 20px;
  margin: 14px 0;
  background: #fffdfa;
  line-height: 1.7;
  white-space: pre-wrap;
}

.batch-date {
  color: #888;
  font-size: 13px;
}

.note {
  font-size: 13px;
  color: #777;
  text-align: center;
  margin-top: 25px;
}

.hidden {
  display: none;
}

.lock-title {
  text-align: center;
}
</style>
</head>

<body>

<div class="container">

<div id="setup" class="card hidden">
  <h2 class="lock-title">🔐 Create your diary password</h2>

  <p>
    Your diary will be encrypted locally with this password.
    The password is never sent to an AI service.
  </p>

  <input
    id="setupPassword"
    type="password"
    placeholder="Create password (minimum 6 characters)"
  >

  <button onclick="setupDiary()">
    Create secure diary
  </button>

  <div class="status" id="setupStatus"></div>
</div>

<div id="login" class="card hidden">
  <h2 class="lock-title">🔒 Deniable Diary</h2>

  <p class="subtitle">
    Enter your password to unlock your encrypted diary.
  </p>

  <input
    id="loginPassword"
    type="password"
    placeholder="Password"
    onkeydown="if(event.key === 'Enter') login()"
  >

  <button onclick="login()">
    Unlock diary
  </button>

  <div class="status" id="loginStatus"></div>
</div>

<div id="app" class="hidden">

<header>
<h1>📝 Deniable Diary</h1>

<div class="subtitle">
Four plausible entries. No labels. You remember which one is yours.
</div>

<button onclick="lockDiary()" style="margin-top: 16px;">
🔒 Lock Diary
</button>
</header>

<div class="card">
<h2>Write today's entry</h2>

<textarea
  id="entry"
  placeholder="Write what actually happened..."
></textarea>

<button id="save" onclick="saveEntry()">
Save privately
</button>

<div class="status" id="status"></div>
</div>

<div id="diary"></div>

<div class="note">
🤖 AI generation runs locally on this device using Tether QVAC.
<br>
�� Your real diary entry is never sent to the AI model.
<br>
🔐 Saved diary data is encrypted locally.
</div>

</div>

</div>

<script>

async function checkAuth() {
  try {
    const response = await fetch('/api/status')
    const result = await response.json()

    document.getElementById('setup').classList.add('hidden')
    document.getElementById('login').classList.add('hidden')
    document.getElementById('app').classList.add('hidden')

    if (!result.hasPassword) {
      document.getElementById('setup').classList.remove('hidden')
    } else if (result.authenticated) {
      document.getElementById('app').classList.remove('hidden')
      renderDiary()
    } else {
      document.getElementById('login').classList.remove('hidden')
    }

  } catch (error) {
    console.error(error)
  }
}

async function setupDiary() {
  const password =
    document.getElementById('setupPassword').value

  const status =
    document.getElementById('setupStatus')

  if (!password) {
    status.textContent = 'Enter a password.'
    return
  }

  try {
    const response = await fetch('/api/setup', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ password })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error)
    }

    document.getElementById('setupPassword').value = ''

    await checkAuth()

  } catch (error) {
    status.textContent = 'Error: ' + error.message
  }
}

async function login() {
  const password =
    document.getElementById('loginPassword').value

  const status =
    document.getElementById('loginStatus')

  if (!password) {
    status.textContent = 'Enter your password.'
    return
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ password })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error)
    }

    document.getElementById('loginPassword').value = ''

    await checkAuth()

  } catch (error) {
    status.textContent = 'Error: ' + error.message
  }
}

async function lockDiary() {
  try {
    await fetch('/api/logout', {
      method: 'POST'
    })
  } finally {
    location.reload()
  }
}

async function saveEntry() {
  const textarea =
    document.getElementById('entry')

  const button =
    document.getElementById('save')

  const status =
    document.getElementById('status')

  const text =
    textarea.value.trim()

  if (!text) {
    status.textContent = 'Write an entry first.'
    return
  }

  button.disabled = true

  status.textContent =
    'Loading local model and creating 3 decoys...'

  try {
    const response = await fetch('/api/diary', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ entry: text })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error)
    }

    textarea.value = ''

    status.textContent =
      'Saved. Four entries were shuffled and encrypted locally.'

    renderDiary()

  } catch (error) {
    status.textContent =
      'Error: ' + error.message

  } finally {
    button.disabled = false
  }
}

async function renderDiary() {
  const response =
    await fetch('/api/diary')

  if (!response.ok) return

  const batches =
    await response.json()

  const diary =
    document.getElementById('diary')

  diary.innerHTML =
    batches
      .slice()
      .reverse()
      .map(batch => {

        const date =
          new Date(batch.createdAt).toLocaleString()

        const entries =
          batch.entries
            .map(entry =>
              '<div class="entry">' +
              escapeHtml(entry) +
              '</div>'
            )
            .join('')

        return (
          '<div class="card">' +
          '<div class="batch-date">' +
          escapeHtml(date) +
          '</div>' +
          entries +
          '</div>'
        )
      })
      .join('')
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, char => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[char]))
}

checkAuth()

</script>

</body>
</html>
`

const server = http.createServer(async (req, res) => {

  try {

    if (req.method === 'GET' && req.url === '/') {

      res.writeHead(200, {
        'Content-Type': 'text/html'
      })

      res.end(html)

      return
    }

    if (req.method === 'GET' && req.url === '/api/status') {

      const passwordExists =
        await hasPassword()

      const password =
        getSessionPassword(req)

      sendJson(res, 200, {
        hasPassword: passwordExists,
        authenticated: Boolean(password)
      })

      return
    }

    if (req.method === 'POST' && req.url === '/api/setup') {

      const { password } =
        await readBody(req)

      await setupPassword(password)

      const token =
        createSession(password)

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie':
          'session=' +
          token +
          '; HttpOnly; SameSite=Strict; Path=/'
      })

      res.end(JSON.stringify({
        success: true
      }))

      return
    }

    if (req.method === 'POST' && req.url === '/api/login') {

      const { password } =
        await readBody(req)

      const valid =
        await verifyPassword(password)

      if (!valid) {

        sendJson(res, 401, {
          error: 'Incorrect password.'
        })

        return
      }

      const token =
        createSession(password)

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie':
          'session=' +
          token +
          '; HttpOnly; SameSite=Strict; Path=/'
      })

      res.end(JSON.stringify({
        success: true
      }))

      return
    }

    if (req.url === '/api/logout' && req.method === 'POST') {

      const cookie = req.headers.cookie || ''
      const match = cookie.match(/(?:^|; )session=([^;]+)/)

      if (match) {
        sessions.delete(match[1])
      }

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie':
          'session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
      })

      res.end(JSON.stringify({
        success: true
      }))

      return
    }

    if (req.url === '/api/diary') {

      const password =
        getSessionPassword(req)

      if (!password) {

        sendJson(res, 401, {
          error: 'Diary is locked.'
        })

        return
      }

      if (req.method === 'GET') {

        const diary =
          await getDiary(password)

        sendJson(res, 200, diary)

        return
      }

      if (req.method === 'POST') {

        const { entry } =
          await readBody(req)

        if (!entry || !entry.trim()) {

          sendJson(res, 400, {
            error: 'Diary entry cannot be empty.'
          })

          return
        }

        console.log(
          'Generating 3 local QVAC decoys...'
        )

        const batch =
          await createDiaryBatch(
            entry.trim(),
            password,
            progress => {

              if (
                progress?.percentage !== undefined
              ) {

                console.log(
                  'Model progress:',
                  progress.percentage + '%'
                )

              } else {

                console.log(progress)

              }
            }
          )

        sendJson(res, 200, batch)

        return
      }
    }

    res.writeHead(404)
    res.end('Not found')

  } catch (error) {

    console.error(error)

    sendJson(res, 500, {
      error: error.message
    })
  }
})

server.listen(PORT, () => {

  console.log('')
  console.log('📝 Deniable Diary is running!')
  console.log('Open: http://localhost:' + PORT)
  console.log('🔐 Local encrypted diary storage enabled')
  console.log('🤖 Local QVAC inference enabled')
  console.log('')

})
