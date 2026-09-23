import {
  loadModel,
  LLAMA_3_2_1B_INST_Q4_0,
  completion,
  unloadModel
} from '@qvac/sdk'

try {
  console.log('Loading QVAC model...')

  const modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    onProgress: (progress) => {
      console.log('Download/load progress:', progress)
    }
  })

  console.log('Model loaded successfully!')

  const history = [
    {
      role: 'user',
      content: 'Say hello in one short sentence.'
    }
  ]

  console.log('Asking the local model...')

  const result = completion({
    modelId,
    history,
    stream: true
  })

  for await (const token of result.tokenStream) {
    process.stdout.write(token)
  }

  console.log('\n')
  console.log('QVAC test completed successfully.')

  await unloadModel({ modelId })

  console.log('Model unloaded.')
} catch (error) {
  console.error('QVAC test failed:', error)
  process.exit(1)
}
