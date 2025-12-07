import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [module, version, sum] = process.argv.slice(2)

const result = JSON.parse(execFileSync('go', ['mod', 'download', '-json', `${module}@${version}`], {
    encoding: 'utf-8',
}))

if (result.Error) {
    throw new Error(`go: ${result.Error}`)
}

if (result.Sum !== sum) {
    throw new Error(`module checksum mismatch: expected ${sum}, got ${result.Sum}`)
}

writeFileSync(fileURLToPath(new URL('marisa.wasm', import.meta.url)), readFileSync(join(result.Dir, 'lib', 'marisa.wasm')), {
    mode: 0o644,
})
