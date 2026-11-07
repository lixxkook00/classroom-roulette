/** Turns a pasted list (one per line, maybe numbered or copied from a spreadsheet) into names. */
export function parseNames(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const cells = line.split('\t').map((c) => c.trim()).filter(Boolean)
      const cell = cells.find((c) => !/^\d+[.)]?$/.test(c)) ?? ''
      return cell.replace(/^\d+\s*[.)\-:]\s*/, '').trim()
    })
    .filter(Boolean)
}
