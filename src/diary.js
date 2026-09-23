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

const DECOY_SCENARIOS = [
  'a frustrating morning when a bus was late and you had to change your plans',
  'finding an old photograph while cleaning a drawer at home',
  'trying to cook a new recipe that did not turn out exactly as expected'
]

function secureShuffle(entries) {
  const shuffled = [...entries]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomBytes(4).readUInt32BE(0) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

function cleanDecoy(text) {
  return text
    .replace(/^["']|["']$/g, '')
    .replace(/^(dear diary[,:]?\s*)/i, '')
    .replace(/^(alternative|fake|fictional|decoy)\s+diary\s+entry\s*\d*\s*:?\s*/i, '')
    .trim()
}

async function generateDecoy(modelId, scenario) {
  const history = [
    {
      role: 'system',
      content: `Write one short fictional personal diary entry.

Rules:
- Write in first person.
- Sound natural and casual.
- Write approximately 50-90 words.
- Use ONLY the scenario provided.
- Do not mention AI.
- Do not call it fake, fictional, alternative, or a decoy.
- Do not use a title.
- Do not start with "Dear Diary".
- Output ONLY the diary entry.`
    },
    {
      role: 'user',
      content: `Write a diary entry about this unrelated everyday situation:

${scenario}`
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

  return cleanDecoy(text)
}

export async function getDiary() {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8'))
  } catch {
    return []
  }
}

async function saveDiary(diary) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(diary, null, 2), 'utf8')
}

export async function createDiaryBatch(realEntry, onProgress = () => {}) {
  const modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    onProgress
  })

  try {
    const decoys = []

    for (const scenario of DECOY_SCENARIOS) {
      decoys.push(await generateDecoy(modelId, scenario))
    }

    const entries = secureShuffle([realEntry, ...decoys])

    const diary = await getDiary()

    const batch = {
      id: randomBytes(16).toString('hex'),
      createdAt: new Date().toISOString(),
      entries
    }

    diary.push(batch)
    await saveDiary(diary)

    return batch
  } finally {
    await unloadModel({ modelId })
  }
}
