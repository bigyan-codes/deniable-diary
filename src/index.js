import {
  loadModel,
  LLAMA_3_2_1B_INST_Q4_0,
  completion,
  unloadModel
} from '@qvac/sdk'
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const DATA_DIR = './data'
const DATA_FILE = `${DATA_DIR}/diary.json`

async function generateDecoy(modelId, realEntry, index) {
  const history = [
    {
      role: 'system',
      content: `You are helping create a private deniable diary.

Write ONE plausible diary entry that could have been written by the same person as the real entry.

Rules:
- Do NOT copy the real entry.
- Do NOT mention that you are creating a fake or decoy.
- Keep a similar writing style, tone, length, and level of detail.
- Create different but believable events or thoughts.
- Output ONLY the diary entry.`
    },
    {
      role: 'user',
      content: `Real diary entry:

${realEntry}

Create plausible alternative diary entry number ${index}.`
    }
  ]

  const result = completion({
    modelId,
    history,
    stream: true
  })

  let text = ''

  for await (const token of result.tokenStream) {
    text += token
  }

  return text.trim()
}

function secureShuffle(entries) {
  const shuffled = [...entries]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const random = randomBytes(4).readUInt32BE(0)
    const j = random % (i + 1)

    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

async function loadDiary() {
  try {
    const data = await readFile(DATA_FILE, 'utf8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveDiary(entries) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(entries, null, 2), 'utf8')
}

async function createDiaryBatch(realEntry) {
  console.log('\nLoading local QVAC model...')

  const modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    onProgress: (progress) => {
      if (progress.percentage !== undefined) {
        process.stdout.write(`\rModel: ${progress.percentage}%`)
      }
    }
  })

  console.log('\nModel loaded.')

  try {
    const decoys = []

    for (let i = 1; i <= 3; i++) {
      console.log(`Generating decoy ${i}/3...`)
      const decoy = await generateDecoy(modelId, realEntry, i)
      decoys.push(decoy)
    }

    const entries = secureShuffle([realEntry, ...decoys])

    const diary = await loadDiary()

    diary.push({
      id: randomBytes(16).toString('hex'),
      createdAt: new Date().toISOString(),
      entries
    })

    await saveDiary(diary)

    console.log('\nSaved four shuffled entries.')
    console.log('\nYour four diary entries:\n')

    entries.forEach((entry, index) => {
      console.log(`--- Entry ${index + 1} ---`)
      console.log(entry)
      console.log()
    })
  } finally {
    await unloadModel({ modelId })
    console.log('QVAC model unloaded.')
  }
}

const realEntry = process.argv.slice(2).join(' ').trim()

if (!realEntry) {
  console.log('Usage:')
  console.log('node src/index.js "Your diary entry goes here"')
  process.exit(1)
}

await createDiaryBatch(realEntry)
