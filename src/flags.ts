export type CacheLevel = 'huge' | 'large' | 'normal' | 'small' | 'tiny'
export type TailMode = 'text' | 'binary'
export type NodeOrder = 'label' | 'weight'

const _MARISA_MIN_NUM_TRIES = 0x00001
const _MARISA_MAX_NUM_TRIES = 0x0007F
const _MARISA_DEFAULT_NUM_TRIES = 0x00003

const _MARISA_HUGE_CACHE = 0x00080
const _MARISA_LARGE_CACHE = 0x00100
const _MARISA_NORMAL_CACHE = 0x00200
const _MARISA_SMALL_CACHE = 0x00400
const _MARISA_TINY_CACHE = 0x00800
const _MARISA_DEFAULT_CACHE = _MARISA_NORMAL_CACHE

const _MARISA_TEXT_TAIL = 0x01000
const _MARISA_BINARY_TAIL = 0x02000
const _MARISA_DEFAULT_TAIL = _MARISA_TEXT_TAIL

const _MARISA_LABEL_ORDER = 0x10000
const _MARISA_WEIGHT_ORDER = 0x20000
const _MARISA_DEFAULT_ORDER = _MARISA_WEIGHT_ORDER

const _MARISA_NUM_TRIES_MASK = 0x0007F
const _MARISA_CACHE_LEVEL_MASK = 0x00F80
const _MARISA_TAIL_MODE_MASK = 0x0F000
const _MARISA_NODE_ORDER_MASK = 0xF0000
const _MARISA_CONFIG_MASK = 0xFFFFF

export function numTriesFlag(v?: number): number {
  if (v == null || v === 0)
    return _MARISA_DEFAULT_NUM_TRIES
  if (typeof v !== 'number')
    throw new TypeError(`Number of tries must be a number`)
  if (_MARISA_MIN_NUM_TRIES <= v && v <= _MARISA_MAX_NUM_TRIES)
    return v
  throw new RangeError(`Number of tries out of range`)
}

export function cacheLevelFlag(v?: CacheLevel): number {
  if (!v)
    return _MARISA_DEFAULT_CACHE
  switch (v) {
    case 'huge':
      return _MARISA_HUGE_CACHE
    case 'large':
      return _MARISA_LARGE_CACHE
    case 'normal':
      return _MARISA_NORMAL_CACHE
    case 'small':
      return _MARISA_SMALL_CACHE
    case 'tiny':
      return _MARISA_TINY_CACHE
    default:
      const invalid: never = v
      throw new TypeError(`Invalid CacheLevel ${invalid}`)
  }
}

export function tailModeFlag(v?: TailMode): number {
  if (!v)
    return _MARISA_DEFAULT_TAIL
  switch (v) {
    case 'binary':
      return _MARISA_BINARY_TAIL
    case 'text':
      return _MARISA_TEXT_TAIL
    default:
      const invalid: never = v
      throw new TypeError(`Invalid TailMode ${invalid}`)
  }
}

export function nodeOrderFlag(v?: NodeOrder): number {
  if (!v)
    return _MARISA_DEFAULT_ORDER
  switch (v) {
    case 'label':
      return _MARISA_LABEL_ORDER
    case 'weight':
      return _MARISA_WEIGHT_ORDER
    default:
      const invalid: never = v
      throw new TypeError(`Invalid NodeOrder ${invalid}`)
  }
}

export function flagNumTries(f: number): number {
  if (!Number.isInteger(f))
    throw new TypeError(`Flag must be an integer`)
  return f & _MARISA_NUM_TRIES_MASK
}

export function flagCacheLevel(f: number): CacheLevel | undefined {
  if (!Number.isInteger(f))
    throw new TypeError(`Flag must be an integer`)
  switch (f & _MARISA_CACHE_LEVEL_MASK) {
    case _MARISA_HUGE_CACHE:
      return 'huge'
    case _MARISA_LARGE_CACHE:
      return 'large'
    case _MARISA_NORMAL_CACHE:
      return 'normal'
    case _MARISA_SMALL_CACHE:
      return 'small'
    case _MARISA_TINY_CACHE:
      return 'tiny'
  }
}

export function flagTailMode(f: number): TailMode | undefined {
  if (!Number.isInteger(f))
    throw new TypeError(`Flag must be an integer`)
  switch (f & _MARISA_TAIL_MODE_MASK) {
    case _MARISA_TEXT_TAIL:
      return 'text'
    case _MARISA_BINARY_TAIL:
      return 'binary'
  }
}

export function flagNodeOrder(f: number): NodeOrder | undefined {
  if (!Number.isInteger(f))
    throw new TypeError(`Flag must be an integer`)
  switch (f & _MARISA_NODE_ORDER_MASK) {
    case _MARISA_LABEL_ORDER:
      return 'label'
    case _MARISA_WEIGHT_ORDER:
      return 'weight'
  }
}
