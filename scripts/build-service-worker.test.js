import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { BUILD_REVISION_TOKEN, buildServiceWorker, serviceWorkerBuildRevision } from './build-service-worker.mjs'

const temporaryDirectories = []
const template = `const CACHE = 'scp-reading-atlas-${BUILD_REVISION_TOKEN}'\n`

async function release() {
  const root = await mkdtemp(join(tmpdir(), 'scp-service-worker-'))
  temporaryDirectories.push(root)
  const output = join(root, 'dist')
  const templatePath = join(root, 'sw.js')
  await mkdir(join(output, 'assets'), { recursive: true })
  await Promise.all([
    writeFile(templatePath, template),
    writeFile(join(output, 'index.html'), '<script src="assets/app-123.js"></script>'),
    writeFile(join(output, 'assets/app-123.js'), 'console.log("catalog")'),
    writeFile(join(output, 'asset-manifest.json'), '{"app":{"file":"assets/app-123.js"}}'),
    writeFile(join(output, 'icon.svg'), '<svg/>'),
  ])
  return { root, output, templatePath }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('service worker build revision', () => {
  it('emits the same worker for an unchanged build, including repeat writes', async () => {
    const first = await release()
    const second = await release()
    const revision = await buildServiceWorker(first.output, first.templatePath)
    const worker = await readFile(join(first.output, 'sw.js'), 'utf8')

    expect(worker).toContain(`scp-reading-atlas-${revision}`)
    expect(worker).not.toContain(BUILD_REVISION_TOKEN)
    expect(await buildServiceWorker(first.output, first.templatePath)).toBe(revision)
    expect(await readFile(join(first.output, 'sw.js'), 'utf8')).toBe(worker)
    expect(await buildServiceWorker(second.output, second.templatePath)).toBe(revision)
  })

  it.each(['assets/app-123.js', 'index.html', 'asset-manifest.json', 'icon.svg'])(
    'changes the worker and cache revision when %s changes',
    async file => {
      const { output, templatePath } = await release()
      const previousRevision = await buildServiceWorker(output, templatePath)
      const previousWorker = await readFile(join(output, 'sw.js'), 'utf8')
      await writeFile(join(output, file), 'updated release')

      const revision = await buildServiceWorker(output, templatePath)
      expect(revision).not.toBe(previousRevision)
      expect(await readFile(join(output, 'sw.js'), 'utf8')).not.toBe(previousWorker)
    },
  )

  it('changes the revision when a chunk is renamed or the worker logic changes', async () => {
    const { output, templatePath } = await release()
    const initialRevision = await buildServiceWorker(output, templatePath)
    await rm(join(output, 'assets/app-123.js'))
    await writeFile(join(output, 'assets/app-456.js'), 'console.log("catalog")')
    const renamedRevision = await buildServiceWorker(output, templatePath)
    expect(renamedRevision).not.toBe(initialRevision)

    await writeFile(templatePath, `${template}// Updated offline behavior\n`)
    expect(await buildServiceWorker(output, templatePath)).not.toBe(renamedRevision)
  })

  it('fails the build instead of shipping an unresolved or missing revision', async () => {
    const { output, templatePath } = await release()
    await writeFile(templatePath, 'const CACHE = "v6"')
    await expect(buildServiceWorker(output, templatePath)).rejects.toThrow('exactly one build revision')
    await writeFile(templatePath, `${template}${BUILD_REVISION_TOKEN}`)
    await expect(buildServiceWorker(output, templatePath)).rejects.toThrow('exactly one build revision')
  })

  it('watches the worker template and resolves Vite output paths from the project root', async () => {
    const { root, output } = await release()
    const plugin = serviceWorkerBuildRevision()
    const watchedFiles = []
    plugin.configResolved({ root, publicDir: root, build: { outDir: 'dist' } })
    plugin.buildStart.call({ addWatchFile: path => watchedFiles.push(path) })
    expect(watchedFiles).toEqual([join(root, 'sw.js')])

    await plugin.writeBundle({ dir: 'dist' })
    expect(await readFile(join(output, 'sw.js'), 'utf8')).not.toContain(BUILD_REVISION_TOKEN)
  })
})
