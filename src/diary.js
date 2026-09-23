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
  'trying to cook a new recipe that did not turn out exactly as expected',
  'taking a quiet evening walk and noticing something interesting in the neighborhood',
  'buying a small item at a local shop and having an unexpected conversation',
  'spending a rainy afternoon reading or watching something at home'
]

function makeId() {
  return randomBytes(12).toString('hex')
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function getDecoyWordRange(realEntry) {
  const count = countWords(realEntry)

  if (count <= 20) {
    return { min: 18, max: 30 }
  }

  const min = Math.max(20, Math.floor(count * 0.8))
  const max = Math.max(min + 5, Math.ceil(count * 1.2))

  return { min, max }
}

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true })

  try {
    await readFile(DATA_FILE, 'utf8')
  } catch {
    await writeFile(DATA_FILE, '[]', 'utf8')
  }
}

async function readDiary() {
  await ensureDataFile()
  const raw = await readFile(DATA_FILE, 'utf8')
  return JSON.parse(raw)
}

async function writeDiary(entries) {
  await ensureDataFile()
  await writeFile(DATA_FILE, JSON.stringify(entries, null, 2), 'utf8')
}

async function generateDecoy(modelId, scenario, wordRange) {
  const history = [
    {
      role: 'user',
      content: `Write one fictional first-person diary entry about this scenario:

${scenario}

Requirements:
- Write approximately ${wordRange.min}-${wordRange.max} words.
- Make it sound like a normal personal diary entry.
- Use natural, casual language.
- Include a few ordinary concrete details.
- Do not mention AI, prompts, fake entries, decoys, privacy, or this instruction.
- Do not add a title or label.
- Return only the diary entry.`
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

export async function createDiaryBatch(realEntry, onProgress = () => {}) {
  if (!realEntry || !realEntry.trim()) {
    throw new Error('Diary entry cannot be empty.')
  }

  const cleanRealEntry = realEntry.trim()
  const wordRange = getDecoyWordRange(cleanRealEntry)

  onProgress('Loading local QVAC model...')

  const modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0
  })

  try {
    const shuffledScenarios = [...DECOY_SCENARIOS].sort(
      () => Math.random() - 0.5
    )

    const decoys = []

    for (let i = 0; i < 3; i++) {
      onProgress(`Generating decoy ${i + 1} of 3 locally...`)

      const decoy = await generateDecoy(
        modelId,
        shuffledScenarios[i],
        wordRange
      )

      decoys.push(decoy)
    }

    onProgress('Shuffling entries...')

    const entries = [cleanRealEntry, ...decoys].sort(
      () => randomBytes(4).readUInt32BE(0) / 0xffffffff - 0.5
    )

    const batch = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      entries
    }

    const existing = await readDiary()
    existing.push(batch)
    await writeDiary(existing)

    onProgress('Diary saved locally.')

    return batch
  } finally {
    await unloadModel({ modelId })
  }
}

export async function getDiary() {
  return readDiary()
}