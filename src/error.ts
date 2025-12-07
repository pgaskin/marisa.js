export class MarisaError extends Error {
  constructor(typ: string | null, std: string | null, what: string | null) {
    super(`${std ?? typ}${std ?? typ ? ': ' : ''}${what ?? ''}`)
    this.name = 'MarisaError'
  }
}

export function cxx_throw(mod: WebAssembly.Instance, typ: number, std: number, what: number): never {
  const typStr = cString(mod.exports.memory as WebAssembly.Memory, typ, 256)
  const stdStr = cString(mod.exports.memory as WebAssembly.Memory, std, 256)
  const whatStr = cString(mod.exports.memory as WebAssembly.Memory, what, 8192)
  const exc = new MarisaError(typStr, stdStr, whatStr)
    ; (mod.exports.wexcept_cxx_throw_destroy as () => void)()
  throw exc
}

function cString(mem: WebAssembly.Memory, ptr: number, maxLen: number): string | null {
  if (ptr === 0)
    return null
  const b = new Uint8Array(mem.buffer, ptr, maxLen)
  const i = b.indexOf(0)
  return new TextDecoder().decode(b.subarray(0, i == -1 ? b.length : i))
}
