type PaginationOptions = {
  total: number
  count: number
  limit?: number
  offset?: number
}

export const formatHeader = (label: string, options: PaginationOptions): string => {
  const { total, count, limit, offset } = options

  if (count === 0) {
    return label + ' (0 results)'
  }

  const start = (offset ?? 0) + 1
  const end = (offset ?? 0) + count
  const pageSize = limit ?? count
  const page = pageSize > 0 ? Math.floor((offset ?? 0) / pageSize) + 1 : 1

  return label + ' (showing ' + start + '-' + end + ' of ' + total + ', page ' + page + ')'
}

export const formatDate = (raw: string, time?: boolean): string => {
  const d = new Date(raw)

  if (isNaN(d.getTime())) {
    return raw
  }

  const fmt: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: time ? 'numeric' : undefined,
    minute: time ? '2-digit' : undefined,
  }

  return d.toLocaleString('en-US', fmt)
}

type FormatResultsOptions<T> = {
  label: string
  items: Array<T>
  total: number
  limit?: number
  offset?: number
  renderItem: (item: T, index: number) => string
}

export const formatResults = <T>(options: FormatResultsOptions<T>): string => {
  const header = formatHeader(options.label, {
    total: options.total,
    count: options.items.length,
    limit: options.limit,
    offset: options.offset,
  })

  if (options.items.length === 0) {
    return header
  }

  const body = options.items
    .map((item, i) => options.renderItem(item, i))
    .join('\n\n')

  return header + '\n\n' + body
}
