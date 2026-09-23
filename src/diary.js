import {
  loadModel,
  LLAMA_3_2_1B_INST_Q4_0,
  completion,
  unloadModel
} from '@qvac/sdk'
import { randomBytes, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const DATA_DIR = './data'
const DATA_FILE = `${DATA_DIR}/diary.enc`
const AUTH_FILE = `${DATA_DIR}/auth.json`

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

async function ensureDataDirectory() {
  await mkdir(DATA_DIR, { recursive: true })
}

function deriveKey(password, salt) {
  return scryptSync(password, salt, 32)
}

export async function hasPassword() {
  await ensureDataDirectory()

  try {
    await readFile(AUTH_FILE, 'utf8')
    return true
  } catch {
    return false
  }
}

export async function setupPassword(password) {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.')
  }

  await ensureDataDirectory()

  if (await hasPassword()) {
    throw new Error('A password has already been set.')
  }

  const salt = randomBytes(16)
  const hash = deriveKey(password, salt)

  await writeFile(
    AUTH_FILE,
    JSON.stringify({
      salt: salt.toString('base64'),
      hash: hash.toString('base64')
    }, null, 2),
    'utf8'
  )

  await writeEncryptedDiary([], password)
}

export async function verifyPassword(password) {
  await ensureDataDirectory()

  try {
    const auth = JSON.parse(await readFile(AUTH_FILE, 'utf8'))
    const salt = Buffer.from(auth.salt, 'base64')
    const storedHash = Buffer.from(auth.hash, 'base64')
    const suppliedHash = deriveKey(password, salt)

    return timingSafeEqual(storedHash, suppliedHash)
  } catch {
    return false
  }
}

async function readEncryptedDiary(password) {
  await ensureDataDirectory()

  let encrypted

  try {
    encrypted = JSON.parse(await readFile(DATA_FILE, 'utf8'))
  } catch {
    return []
  }

  const salt = Buffer.from(encrypted.salt, 'base64')
  const iv = Buffer.from(encrypted.iv, 'base64')
  const authTag = Buffer.from(encrypted.authTag, 'base64')
  const ciphertext = Buffer.from(encrypted.data, 'base64')

  const key = deriveKey(password, salt)

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ])

  return JSON.parse(decrypted.toString('utf8'))
}

async function writeEncryptedDiary(entries, password) {
  await ensureDataDirectory()

  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = deriveKey(password, salt)

  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(entries), 'utf8'),
    cipher.final()
  ])

  const authTag = cipher.getAuthTag()

  await writeFile(
    DATA_FILE,
    JSON.stringify({
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      data: encrypted.toString('base64')
    }, null, 2),
    'utf8'
  )
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

export async function createDiaryBatch(realEntry, password, onProgress = () => {}) {
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

    const existing = await readEncryptedDiary(password)
    existing.push(batch)

    await writeEncryptedDiary(existing, password)

    onProgress('Diary encrypted and saved locally.')

    return batch
  } finally {
    await unloadModel({ modelId })
  }
}

export async function getDiary(password) {
  return readEncryptedDiary(password)
}
