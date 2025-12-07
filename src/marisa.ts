// @ts-expect-error
import wasm from './marisa.wasm'

export interface MarisaInstance extends WebAssembly.Instance {
  exports: MarisaExports
}

export interface MarisaExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory

  aligned_alloc(alignment: number, size: number): number
  malloc(size: number): number
  free(ptr: number): void

  wexcept_cxx_throw_destroy(): void

  marisa_new(ptr: number, size: number): void
  marisa_load(): void
  marisa_save(): void
  marisa_build_push(ptr: number, length: number, weight: number): void
  marisa_build(flags: number): void
  marisa_stat(): [size: number, io_size: number, total_size: number, num_tries: number, num_nodes: number, tail_mode: number, node_order: number]

  marisa_query_new(): number
  marisa_query_set_str(agent: number, ptr: number, len: number): void
  marisa_query_set_id(agent: number, id: number): void
  marisa_query_clear(agent: number): void
  marisa_query_free(agent: number): void
  marisa_query_lookup(agent: number): 0 | 1
  marisa_query_reverse_lookup(agent: number): 0 | 1
  marisa_query_common_prefix_search(agent: number): 0 | 1
  marisa_query_predictive_search(agent: number): 0 | 1
  marisa_query_result(agent: number): [id: number, ptr: number, len: number]
}

export interface MarisaImports extends WebAssembly.Imports {
  marisa: {
    read(ptr: number, n: number): void
    write(ptr: number, n: number): void
  }
  wexcept: {
    cxx_throw(typ: number, std: number, what: number): never
  }
}

const module = compile(new URL(wasm, import.meta.url))

async function compile(url: URL) {
  // @ts-expect-error
  if (typeof process !== "undefined" && process.versions != null && process.versions.node != null) {
    // @ts-expect-error
    const { readFileSync } = await import('node:fs')
    // @ts-expect-error
    const { fileURLToPath } = await import('node:url')
    return WebAssembly.compile(readFileSync(fileURLToPath(url)))
  } else {
    return WebAssembly.compileStreaming(fetch(url))
  }
}

export async function instantiate(imports: MarisaImports): Promise<MarisaInstance> {
  return WebAssembly.instantiate(await module, imports) as Promise<MarisaInstance>
}
