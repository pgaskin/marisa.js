import { type MarisaInstance, instantiate } from './marisa'
import { type CacheLevel, type TailMode, type NodeOrder, flagTailMode, flagNodeOrder, numTriesFlag, cacheLevelFlag, tailModeFlag, nodeOrderFlag } from './flags'
import { cxx_throw } from './error'

const utf8encoder = new TextEncoder()
const utf8decoder = new TextDecoder('utf-8')

export interface Config {
  numTries?: number
  cacheLevel?: CacheLevel
  tailMode?: TailMode
  nodeOrder?: NodeOrder
}

const keyWeight = Symbol('keyWeight')

export function key(key: string, weight: number = 1.0): String {
  if (typeof weight !== 'number' || !isFinite(weight))
    throw new TypeError(`Weight must be a finite number`)
  return Object.defineProperty(new String(key), keyWeight, {
    value: weight,
  })
}

export type Result = Generator<[id: number, key: string], void, void>

const shortQueryLen = 128

/** MARISA trie. */
export class Trie {
  #mod?: MarisaInstance
  #read?: ((data: number | Uint8Array) => void)
  #write?: ((data: number | Uint8Array) => void)

  static async #instantiate(): Promise<Trie> {
    const trie = new Trie()
    trie.#mod = await instantiate({
      marisa: {
        read: (ptr, n) => void (n !== 0 && trie.#read?.(ptr === 0 ? n : new Uint8Array((trie.#mod!.exports.memory as WebAssembly.Memory).buffer, ptr, n))),
        write: (ptr, n) => void (n !== 0 && trie.#write?.(ptr === 0 ? n : new Uint8Array((trie.#mod!.exports.memory as WebAssembly.Memory).buffer, ptr, n))),
      },
      wexcept: {
        cxx_throw: (typ, std, what) => cxx_throw(trie.#mod!, typ, std, what),
      },
    })
    return trie
  }

  #alloc(n: number): number {
    if (!Number.isInteger(n))
      throw new TypeError(`Allocation size must be an integer`)
    return this.#mod!.exports.malloc(n)
  }

  #free(ptr: number): void {
    if (ptr != null && ptr !== 0) {
      this.#mod!.exports.free(ptr)
    }
  }

  #size = 0
  #ioSize = 0
  #totalSize = 0
  #numTries = 0
  #numNodes = 0
  #tailMode?: TailMode
  #nodeOrder?: NodeOrder

  #stat() {
    const res = this.#mod!.exports.marisa_stat()
    this.#size = res[0]
    this.#ioSize = res[1]
    this.#totalSize = res[2]
    this.#numTries = res[3]
    this.#numNodes = res[4]
    this.#tailMode = flagTailMode(res[5])
    this.#nodeOrder = flagNodeOrder(res[6])
  }

  /** The number of keys in the dictionary. Keys are numbered from 0 to size-1. */
  get size() {
    return this.#size
  }

  /** The serialized size of the dictionary. */
  get diskSize() {
    return this.#ioSize
  }

  /** The in-memory size of the dictionary. */
  get totalSize() {
    return this.#totalSize
  }

  /** The number of tries in the dictionary. */
  get numTries() {
    return this.#numTries
  }

  /** The number of nodes in the dictionary. */
  get numNodes() {
    return this.#numNodes
  }

  /** The tail mode of the dictionary. */
  get tailMode() {
    return this.#tailMode
  }

  /** The node order of the dictionary. */
  get nodeOrder() {
    return this.#nodeOrder
  }

  /**
   * Build a dictionary out of the specified set of keys (use {@link key} to
   * specify the weight). If a key is specified multiple times, the weights
   * are accumulated.
   */
  static async build(values: Iterable<string | { toString(): string }, void, void>, cfg?: Config): Promise<Trie> {
    const flags = 0
      | numTriesFlag(cfg?.numTries)
      | cacheLevelFlag(cfg?.cacheLevel)
      | tailModeFlag(cfg?.tailMode)
      | nodeOrderFlag(cfg?.nodeOrder)

    const trie = await this.#instantiate()
    const step = 1024
    let alloc = step
    let ptr = trie.#alloc(step)
    for (const item of values) {
      const key = item.toString()
      const weight = (item as any)[keyWeight] ?? 1.0
      let n: number
      while (true) {
        const stats = utf8encoder.encodeInto(key, new Uint8Array(trie.#mod!.exports.memory.buffer, ptr, alloc))
        if (stats.read >= key.length) {
          n = stats.written
          break
        }
        trie.#free(ptr)
        alloc = Math.floor((key.length * 3 + step - 1) / step) * step
        ptr = trie.#alloc(alloc)
      }
      trie.#mod!.exports.marisa_build_push(ptr, n, weight)
    }
    trie.#mod!.exports.marisa_build(flags)
    trie.#stat()
    return trie
  }

  /**
   * Read a serialized dictionary from a stream. The specified callback must
   * skip the specified number of bytes, read the full length of the provided
   * array, or throw.
   */
  readFromSync(cb: (data: number | Uint8Array) => void) {
    if (!this.#mod)
      throw new Error(`Dictionary not initialized`)
    if (this.#read)
      throw new Error(`Nested read calls are not allowed`)
    try {
      this.#read = data => cb(data)
      this.#mod.exports.marisa_load()
    } finally {
      this.#read = undefined
    }
  }

  /**
   * Write a serialized dictionary to a stream. The specified callback must
   * write the specified number of bytes of zeros, write the full array, or
   * throw.
   */
  writeToSync(cb: (data: number | Uint8Array) => void) {
    if (!this.#mod)
      throw new Error(`Dictionary not initialized`)
    if (this.#write)
      throw new Error(`Nested read calls are not allowed`)
    try {
      this.#write = data => cb(data)
      this.#mod.exports.marisa_save()
    } finally {
      this.#write = undefined
    }
  }

  /** Incrementally read a dictionary from a stream. */
  //static async readFrom(stream: ReadableStream): Promise<Trie>

  /** Incrementally write a dictionary to a stream. */
  //async writeTo(stream: WritableStream): Promise<void>

  /** Load a serialized dictionary. */
  static async load(buffer: ArrayBufferLike): Promise<Trie> {
    const trie = await this.#instantiate()
    const ptr = trie.#alloc(buffer.byteLength)
    const buf = new Uint8Array(trie.#mod!.exports.memory.buffer, ptr, buffer.byteLength)
    buf.set(new Uint8Array(buffer))
    trie.#mod!.exports.marisa_new(ptr, buf.length)
    trie.#stat()
    return trie
  }

  /** Serialize the dictionary. */
  save(): ArrayBuffer {
    if (!this.#mod)
      throw new Error(`Dictionary not initialized`)
    const buf = new Uint8Array(this.#ioSize)
    let off = 0
    this.writeToSync(data => {
      if (typeof data === 'number') {
        if (data > buf.length - off)
          throw new Error(`wtf: attempted to write more than ioSize`)
        off += data
      } else {
        if (data.length > buf.length - off)
          throw new Error(`wtf: attempted to write more than ioSize`)
        buf.set(data, off)
        off += data.length
      }
    })
    return buf.buffer
  }

  /** Get the ID of a registered key, or null if it doesn't exist. */
  lookup(key: string): number | null {
    if (this.#mod) {
      const q = this.#queryString(key)
      try {
        if (this.#mod.exports.marisa_query_lookup(q.ptr)) {
          const [id] = this.#mod.exports.marisa_query_result(q.ptr)
          return id
        }
      } finally {
        this.#queryDone(q)
      }
    }
    return null
  }

  /** Get the key by its ID, or null if out of range. */
  reverseLookup(id: number): string | null {
    if (this.#mod) {
      if (id >= this.size) {
        return null // optimization
      }
      const q = this.#queryId(id)
      try {
        if (this.#mod.exports.marisa_query_reverse_lookup(q.ptr)) {
          const [, ptr, len] = this.#mod.exports.marisa_query_result(q.ptr)
          return utf8decoder.decode(new Uint8Array(this.#mod.exports.memory.buffer, ptr, len))
        }
      } finally {
        this.#queryDone(q)
      }
    }
    return null
  }

  /** Like {@link dump}. */
  [Symbol.iterator]() {
    return this.dump()
  }

  /** Yield all keys. */
  dump(): Result {
    return this.predictiveSearch("")
  }

  /** Yield all keys starting with a query string. */
  predictiveSearch(query: string): Result {
    return this.#search(this.#mod!.exports.marisa_query_predictive_search, query)
  }

  /** Yield all keys which equal any prefix of the query string. */
  commonPrefixSearch(query: string): Result {
    return this.#search(this.#mod!.exports.marisa_query_common_prefix_search, query)
  }

  /** Yield results for the specified query using fn. */
  *#search(fn: (agent: number) => 1 | 0, query: string): Result {
    if (this.#mod) {
      const q = this.#queryString(query)
      try {
        while (fn(q.ptr)) {
          const [id, ptr, len] = this.#mod.exports.marisa_query_result(q.ptr)
          yield [id, utf8decoder.decode(new Uint8Array(this.#mod.exports.memory.buffer, ptr, len))]
        }
      } finally {
        this.#queryDone(q)
      }
    }
  }

  /** Cached agent for reuse. */
  #cachedQuery?: CachedQuery

  /** Get the cached agent, or allocate a new one. */
  #query(): CachedQuery {
    if (this.#cachedQuery) {
      const q = this.#cachedQuery
      this.#cachedQuery = undefined
      return q
    }
    return {
      ptr: this.#mod!.exports.marisa_query_new(),
      shortStr: 0,
      longStr: 0,
    }
  }

  /** Get an agent with the query set to the specified string. */
  #queryString(s: string): CachedQuery {
    s = s.toString()
    const q = this.#query()
    try {
      let str = 0, n = 0
      if (s.length < shortQueryLen) {
        if (!q.shortStr) {
          q.shortStr = this.#alloc(shortQueryLen)
        }
        const stat = utf8encoder.encodeInto(s, new Uint8Array(this.#mod!.exports.memory.buffer, q.shortStr, shortQueryLen))
        if (stat.read === s.length) {
          str = q.shortStr
          n = stat.written
        }
      }
      if (!str) {
        q.longStr = this.#alloc(s.length * 3)
        const stat = utf8encoder.encodeInto(s, new Uint8Array(this.#mod!.exports.memory.buffer, q.longStr, s.length * 3))
        if (stat.read !== s.length)
          throw new Error(`wtf`)
        str = q.longStr
        n = stat.written
      }
      this.#mod!.exports.marisa_query_set_str(q.ptr, str, n)
      return q
    } catch (ex) {
      this.#queryDone(q)
      throw ex
    }
  }

  /** Get an agent with the query set to the specified id. */
  #queryId(id: number): CachedQuery {
    if (!Number.isInteger(id))
      throw new TypeError(`ID must be an integer`)
    const q = this.#query()
    try {
      this.#mod!.exports.marisa_query_set_id(q.ptr, id)
      return q
    } catch (ex) {
      this.#queryDone(q)
      throw ex
    }
  }

  /** Put back the cached agent, or free it. */
  #queryDone(q: CachedQuery): void {
    if (!q)
      return
    if (!q.ptr)
      throw new Error(`wtf: double-free of query`)

    this.#mod!.exports.marisa_query_clear(q.ptr)

    if (q.longStr) {
      this.#free(q.longStr)
      q.longStr = 0
    }
    if (!this.#cachedQuery) {
      this.#cachedQuery = q
      return
    }
    if (q.shortStr) {
      this.#free(q.shortStr)
      q.shortStr = 0
    }
    this.#mod!.exports.marisa_query_free(q.ptr)
    q.ptr = 0
  }
}

interface CachedQuery {
  ptr: number
  shortStr: number
  longStr: number
}
