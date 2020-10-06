import { Regex } from '@aelesia/commons'

export function testUtil(): string {
  return 'test'
}

export function extractMentionedEmails(notification: string): string[] {
  return notification.split(' ').reduce<string[]>((prev, word) => {
    if (word.startsWith('@')) {
      const possibleEmail = word.substring(1)
      if (Regex.is.email(possibleEmail)) {
        return [...prev, word.substring(1)]
      }
    }
    return prev
  }, [])
}

// Yes I do actually want an Object
// eslint-disable-next-line @typescript-eslint/ban-types
export function mapKey<T extends Object, K extends keyof T>(arr: T[], key: K): T[K][] {
  return arr.map((it) => it[key])
}
