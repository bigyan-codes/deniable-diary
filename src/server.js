import http from 'node:http'
import { createDiaryBatch, getDiary } from './diary.js'

const PORT = 3000

const html = `<!DOCTYPE html>
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
h1 { font-size: 42px; margin: 0 0 8px; }
.subtitle { color: #777; }
.card {
  background: white;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,.06);
  margin-bottom: 22px;
}
textarea {
  width: 100%;
  min-height: 180px;
  resize: vertical;
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 16px;
  font: inherit;
  font-size: 16px;
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
button:disabled { opacity: .5; cursor: wait; }
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
</style>
</head>
<body>
<div class="container">
<header>
<h1>📝 Deniable Diary</h1>
<div class="subtitle">Four plausible entries. No labels. You remember which one is yours.</div>
</header>

<div class="card">
<h2>Write today's entry</h2>
<textarea id="entry" placeholder="Write what actually happened..."></textarea>
<button id="save" onclick="saveEntry()">Save privately</button>
<div class="status" id="status"></div>
</div>

<div id="diary"></div>

<div class="note">
AI generation runs locally on this device using QVAC. No diary entry is sent to a cloud AI service.
</div>
</div>

<script>
async function saveEntry() {
  const textarea = document.getElementById('entry')
  const button = document.getElementById('save')
  const status = document.getElementById('status')
  const text = textarea.value.trim()

  if (!text) {
    status.textContent = 'Write an entry first.'
    return
  }

  button.disabled = true
  status.textContent = 'Loading local model and creating 3 decoys...'

  try {
    const response = await fetch('/api/diary', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ entry: text })
    })

    const result = await response.json()

    if (!response.ok) throw new Error(result.error)

    textarea.value = ''
    status.textContent = 'Saved. Four entries were shuffled locally.'
    renderDiary()
  } catch (error) {
    status.textContent = 'Error: ' + error.message
  } finally {
    button.disabled = false
  }
}

async function renderDiary() {
  const response = await fetch('/api/diary')
  const batches = await response.json()
  const diary = document.getElementById('diary')

  diary.innerHTML = batches.slice().reverse().map(batch => {
    const date = new Date(batch.createdAt).toLocaleString()

    return \`
      <div class="card">
        <div class="batch-date">\${date}</div>
        \${batch.entries.map((entry, i) => \`
          <div class="entry">\${escapeHtml(entry)}</div>
        \`).join('')}
      </div>
    \`
  }).join('')
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[char]))
}

renderDiary()
</script>
</body>
</html>`

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, {'Content-Type': 'text/html'})
      res.end(html)
      return
    }

    if (req.method === 'GET' && req.url === '/api/diary') {
      const diary = await getDiary()
      res.writeHead(200, {'Content-Type': 'application/json'})
      res.end(JSON.stringify(diary))
      return
    }

    if (req.method === 'POST' && req.url === '/api/diary') {
      let body = ''

      for await (const chunk of req) {
        body += chunk
      }

      const { entry } = JSON.parse(body)

      if (!entry || !entry.trim()) {
        throw new Error('Diary entry cannot be empty.')
      }

      console.log('Generating 3 local QVAC decoys...')

      const batch = await createDiaryBatch(entry.trim(), progress => {
        if (progress?.percentage !== undefined) {
          console.log('Model progress:', progress.percentage + '%')
        }
      })

      res.writeHead(200, {'Content-Type': 'application/json'})
      res.end(JSON.stringify(batch))
      return
    }

    res.writeHead(404)
    res.end('Not found')
  } catch (error) {
    console.error(error)
    res.writeHead(500, {'Content-Type': 'application/json'})
    res.end(JSON.stringify({error: error.message}))
  }
})

server.listen(PORT, () => {
  console.log('')
  console.log('📝 Deniable Diary is running!')
  console.log('Open: http://localhost:' + PORT)
  console.log('')
})
