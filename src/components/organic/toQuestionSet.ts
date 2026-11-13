import { formatFormulas } from '../../chemFormat'
import type { QuizItem, Txt } from '../../data/organic'
import { uid, type Question, type QuestionSet } from '../../store'

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/** Turns lesson questions into a question set for the "Trả lời câu hỏi" roulette. */
export function toQuestionSet(name: string, items: QuizItem[], L: (x: Txt) => string, tf: { yes: string; no: string; tag: string }): QuestionSet {
  const questions: Question[] = items.map((q) => {
    if (q.kind === 'tf')
      return {
        id: uid(),
        text: formatFormulas(`${tf.tag} ${L(q.text)}`),
        answer: formatFormulas(`${q.answer ? tf.yes : tf.no} — ${L(q.why)}`),
      }
    return {
      id: uid(),
      text: formatFormulas([L(q.text), ...q.options.map((o, i) => `${LETTERS[i]}. ${L(o)}`)].join('\n')),
      answer: formatFormulas(`${LETTERS[q.answer]}. ${L(q.options[q.answer])} — ${L(q.why)}`),
    }
  })
  return { id: uid(), name, questions }
}
