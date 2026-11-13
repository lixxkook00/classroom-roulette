import { BAI_26 } from './lessons/bai26-ethylic-alcohol'
import { BAI_27 } from './lessons/bai27-acetic-acid'
import type { Lesson } from './types'

/**
 * Lessons in the "Lab hữu cơ" tab, in menu order.
 * To add one: copy a file in ./lessons, change the content, import it here and add it to the list.
 */
export const LESSONS: Lesson[] = [BAI_26, BAI_27]

export { MOLECULES } from './molecules'
export * from './types'
