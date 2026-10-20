import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

export const BUILD_REVISION_TOKEN = '__SCP_BUILD_REVISION__'

async function outputFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? outputFiles(path) : [path]
  }))
  return files.flat()
}

export async function buildServiceWorker(outputDirectory, templatePath) {
  const template = await readFile(templatePath, 'utf8')
  if (template.split(BUILD_REVISION_TOKEN).length !== 2) {
    throw new Error('Service worker must contain exactly one build revision placeholder')
  }

  const workerPath = join(outputDirectory, 'sw.js')
  const files = (await outputFiles(outputDirectory))
    .filter(path => path !== workerPath)
    .sort()
  const hash = createHash('sha256').update(template)

  // Include HTML, hashed chunks and copied public assets. Excluding the emitted
  // worker makes repeated builds deterministic instead of hashing its old ID.
  for (const file of files) {
    const contents = await readFile(file)
    const path = relative(outputDirectory, file).replaceAll('\\', '/')
    hash.update(JSON.stringify([path, contents.length])).update(contents)
  }

  const revision = hash.digest('hex').slice(0, 20)
  await writeFile(workerPath, template.replace(BUILD_REVISION_TOKEN, revision))
  return revision
}

export function serviceWorkerBuildRevision() {
  let config

  return {
    name: 'service-worker-build-revision',
    apply: 'build',
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    buildStart() {
      this.addWatchFile(join(config.publicDir, 'sw.js'))
    },
    async writeBundle(options) {
      const outputDirectory = resolve(config.root, options.dir ?? config.build.outDir)
      await buildServiceWorker(outputDirectory, join(config.publicDir, 'sw.js'))
    },
  }
}
