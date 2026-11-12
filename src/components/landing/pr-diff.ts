import { PACKAGE } from '@/config/site'

/**
 * The pull request the landing shows: due dates on cards, as an agent would write it.
 * An illustrative PR, in TypeScript and SQL that read as real, in a unified diff. It hides
 * what cocido would catch: card imports a value object of notifications, and its use case
 * writes to notifications itself instead of telling an event.
 *
 * Hunk headers are written as `@@ -start +start @@`: their line counts are worked out from
 * the lines below them, so they are always right.
 */
const diff = String.raw`diff --git a/backend/contexts/boards/migrations/0023_card_due_date.sql b/backend/contexts/boards/migrations/0023_card_due_date.sql
@@ -0 +1 @@
+ALTER TABLE card ADD COLUMN due_date DATE;
+ALTER TABLE card ADD COLUMN reminder_sent_at TIMESTAMPTZ;
+CREATE INDEX card_due_date_idx ON card (workspace_id, due_date)
+  WHERE due_date IS NOT NULL AND reminder_sent_at IS NULL;
diff --git a/backend/contexts/boards/modules/card/card.schema.ts b/backend/contexts/boards/modules/card/card.schema.ts
@@ -14 +14 @@ export const CardSchema = z.object({
   title: z.string().min(1).max(200),
   description: z.string().max(10_000),
   assigneeId: z.string().nullable(),
+  dueDate: z.iso.date().nullable(),
+  reminderSentAt: z.string().nullable(),
   position: z.number().int().nonnegative(),
   createdAt: z.string(),
@@ -38 +40 @@ export const CardMoveSchema = z.object({
 export type CardMoveDTO = z.input<typeof CardMoveSchema>
+
+export const CardSetDueDateSchema = z.object({
+  dueDate: CardSchema.shape.dueDate,
+})
+
+export type CardSetDueDateDTO = z.input<typeof CardSetDueDateSchema>
diff --git a/backend/contexts/boards/modules/card/card.ts b/backend/contexts/boards/modules/card/card.ts
@@ -1 +1 @@
 import { Entity, type EntityInput } from '${PACKAGE}/core'
 import { CardSchema, type CardAuthor, type CardDTO } from './card.schema'
 import { Card_Assigned } from './events/card-assigned'
+import { Card_DueDateSet } from './events/card-due-date-set'
@@ -93 +94 @@ export class Card extends Entity<typeof CardSchema> {
   reposition(position: number): void {
     this.change({ position })
   }
+
+  setDueDate(dueDate: string | null, author: CardAuthor): void {
+    if (this.data.dueDate === dueDate) return
+    this.change({ dueDate, reminderSentAt: null })
+    this.trackEvent(new Card_DueDateSet({ dto: this.toDTO(), ...author }))
+  }
+
+  markReminderSent(at: string): void {
+    this.change({ reminderSentAt: at })
+  }
diff --git a/backend/contexts/boards/modules/card/card.module.ts b/backend/contexts/boards/modules/card/card.module.ts
@@ -8 +8 @@ import { Card_Created } from './events/card-created'
 import { Card_Moved } from './events/card-moved'
-import { CardNotFound } from './errors/card-not-found'
+import { Card_DueDateSet } from './events/card-due-date-set'
+import { ReminderChannel } from '../../../notifications/modules/notification/value-objects/reminder-channel'
+import { CardNotFound } from './errors/card-not-found'
+import { addDays, startOfDay } from 'date-fns'
@@ -197 +200 @@ export class Card_Module extends Module {
     card.delete(actingAuthor())
     await this.repo.persistOrder([card, ...others], [card.columnId])
   }
+
+  @UseCase()
+  async setDueDate(id: string, input: unknown): Promise<CardDTO> {
+    const { dueDate } = CardSetDueDateSchema.parse(input)
+    const card = await this.load(id)
+    card.setDueDate(dueDate, actingAuthor())
+    await this.repo.persist(card)
+    if (dueDate && card.assigneeId) {
+      const channel = ReminderChannel.from('email')
+      await this.deps.notifications.notification.schedule({
+        userId: card.assigneeId,
+        channel,
+        at: addDays(startOfDay(new Date(dueDate)), -1).toISOString(),
+        payload: { cardId: card.id, title: card.toDTO().title },
+      })
+    }
+    return card.toDTO()
+  }
diff --git a/backend/contexts/boards/modules/card/card.routes.ts b/backend/contexts/boards/modules/card/card.routes.ts
@@ -26 +26 @@ export function registerCardRoutes(base: BoardsBase, cards: Card_Module, deps: Card_Deps): void {
   workspace.post('/cards/:cardId/unassign', async request => Response.json(await cards.unassign(request.params.cardId)))
+
+  workspace.put('/cards/:cardId/due-date', async request =>
+    Response.json(await cards.setDueDate(request.params.cardId, await request.json())))
diff --git a/backend/contexts/boards/modules/card/card.deps.ts b/backend/contexts/boards/modules/card/card.deps.ts
@@ -1 +1 @@
 import type { Access_Module } from '../../../auth/modules/access/access.module'
+import type { Notification_Module } from '../../../notifications/modules/notification/notification.module'
@@ -15 +16 @@ export interface Card_Deps {
   auth: {
     access: Access_Module
   }
+  notifications: {
+    notification: Notification_Module
+  }
 }
diff --git a/backend/contexts/notifications/modules/notification/notification.module.ts b/backend/contexts/notifications/modules/notification/notification.module.ts
@@ -44 +44 @@ export class Notification_Module extends Module {
     return notification.toDTO()
   }
+
+  @UseCase()
+  async schedule(input: unknown): Promise<NotificationDTO> {
+    const parsed = NotificationScheduleSchema.parse(input)
+    const existing = await this.repo.find({ userId: parsed.userId, 'payload.cardId': parsed.payload.cardId })
+    for (const old of existing) await this.repo.delete(old)
+    const notification = Notification.schedule(parsed)
+    await this.repo.persist(notification)
+    return notification.toDTO()
+  }
+
+  async sendDue(now: Date): Promise<number> {
+    const due = await this.repo.dueBefore(now.toISOString(), 200)
+    let sent = 0
+    for (const notification of due) {
+      try {
+        await this.mailer.send(notification.toEmail())
+        notification.markSent(now.toISOString())
+        sent++
+      } catch (error) {
+        console.error('reminder failed', error)
+      }
+    }
+    await this.repo.persist(...due)
+    return sent
+  }
diff --git a/backend/contexts/notifications/modules/notification/notification.repository.ts b/backend/contexts/notifications/modules/notification/notification.repository.ts
@@ -31 +31 @@ export class Notification_Repository extends TableRepository<Notification, NotificationRow> {
     return Notification.fromDTO(row)
   }
+
+  dueBefore(at: string, limit: number): Promise<Notification[]> {
+    return this.find({ sentAt: null, at: { lte: at } }, { orderBy: [{ field: 'at' }], limit })
+  }
+
+  async delete(notification: Notification): Promise<void> {
+    await this.store.sql('DELETE FROM notification WHERE id = $1', [notification.id])
+  }
diff --git a/backend/contexts/notifications/modules/notification/value-objects/reminder-channel.ts b/backend/contexts/notifications/modules/notification/value-objects/reminder-channel.ts
@@ -0 +1 @@
+export class ReminderChannel {
+  private constructor(readonly value: 'email' | 'push' | 'none') {}
+
+  static from(value: string): ReminderChannel {
+    if (value === 'email' || value === 'push' || value === 'none') return new ReminderChannel(value)
+    return new ReminderChannel('none')
+  }
+}
diff --git a/backend/contexts/notifications/modules/digest/digest.module.ts b/backend/contexts/notifications/modules/digest/digest.module.ts
@@ -0 +1 @@
+import { Module, UseCase } from '${PACKAGE}/core'
+import type { BoardsDatabase } from '../../../boards/boards-database'
+
+/** Every Monday: the cards due this week, to each assignee. */
+export class Digest_Module extends Module {
+  readonly weekly
+
+  constructor(base: NotificationsBase, private readonly boards: Kysely<BoardsDatabase>) {
+    super('digest', base.invocations, {})
+    this.weekly = base.schedules.define('digest.weekly', '0 8 * * 1')
+  }
+
+  @UseCase()
+  async sendWeekly(): Promise<void> {
+    const cards = await this.boards.selectFrom('card')
+      .select(['id', 'title', 'assigneeId', 'dueDate'])
+      .where('dueDate', '<=', addDays(new Date(), 7).toISOString())
+      .execute()
+    for (const [userId, due] of Object.entries(groupBy(cards, card => card.assigneeId ?? ''))) {
+      if (userId) await this.mailer.send(weeklyEmail(userId, due))
+    }
+  }
+}
diff --git a/backend/contexts/notifications/modules/notification/notification.workers.ts b/backend/contexts/notifications/modules/notification/notification.workers.ts
@@ -12 +12 @@ export function registerNotificationWorkers(notifications: Notification_Module, deps: Notification_Deps): void {
     queue: 'notification.send.on.notification.created',
   })
+
+  setInterval(() => {
+    notifications.sendDue(new Date()).catch(() => {})
+  }, 60_000)
 }
diff --git a/backend/contexts/boards/modules/card/card.test.ts b/backend/contexts/boards/modules/card/card.test.ts
@@ -402 +402 @@ describe('cards', () => {
   })
+
+  test('sets a due date', async () => {
+    const card = await t.cards.create(board.id, { columnId: todo.id, title: 'Ship it' })
+    const updated = await t.cards.setDueDate(card.id, { dueDate: '2026-12-01' })
+    expect(updated.dueDate).toBe('2026-12-01')
+  })
+
+  test('clears a due date', async () => {
+    const card = await t.cards.create(board.id, { columnId: todo.id, title: 'Ship it' })
+    await t.cards.setDueDate(card.id, { dueDate: '2026-12-01' })
+    const updated = await t.cards.setDueDate(card.id, { dueDate: null })
+    expect(updated.dueDate).toBeNull()
+  })
diff --git a/web/src/features/cards/DueDatePicker.tsx b/web/src/features/cards/DueDatePicker.tsx
@@ -0 +1 @@
+import { useState } from 'react'
+import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
+import { Calendar } from '@/components/ui/calendar'
+import { useSetDueDate } from './use-set-due-date'
+
+export function DueDatePicker({ card }: { card: CardDTO }) {
+  const [open, setOpen] = useState(false)
+  const setDueDate = useSetDueDate(card.id)
+  const value = card.dueDate ? new Date(card.dueDate) : undefined
+
+  return (
+    <Popover open={open} onOpenChange={setOpen}>
+      <PopoverTrigger className="text-xs text-muted-foreground">
+        {value ? value.toLocaleDateString() : 'Add due date'}
+      </PopoverTrigger>
+      <PopoverContent className="w-auto p-0">
+        <Calendar mode="single" selected={value} onSelect={date => {
+          setDueDate.mutate(date ? date.toISOString().slice(0, 10) : null)
+          setOpen(false)
+        }} />
+      </PopoverContent>
+    </Popover>
+  )
+}
diff --git a/web/src/features/cards/CardItem.tsx b/web/src/features/cards/CardItem.tsx
@@ -18 +18 @@ export function CardItem({ card }: { card: CardDTO }) {
       <p className="text-sm font-medium">{card.title}</p>
-      {card.assigneeId && <Avatar userId={card.assigneeId} />}
+      <div className="flex items-center justify-between">
+        <DueDatePicker card={card} />
+        {card.assigneeId && <Avatar userId={card.assigneeId} />}
+      </div>
     </article>`

export type DiffLine = { kind: 'file' | 'hunk' | 'add' | 'del' | 'ctx'; text: string; n?: number }

/** The diff, line by line, with each hunk's header counted from its lines and the new file's line numbers. */
export function diffLines(): DiffLine[] {
  const raw = diff.split('\n')
  const lines: DiffLine[] = []
  let n = 0
  for (let i = 0; i < raw.length; i++) {
    const line = raw[i]
    if (line.startsWith('diff --git')) {
      lines.push({ kind: 'file', text: line.split(' b/')[1] ?? line })
    } else if (line.startsWith('@@')) {
      const [, oldStart, newStart, rest] = /^@@ -(\d+) \+(\d+) @@(.*)$/.exec(line)!
      let olds = 0
      let news = 0
      for (let j = i + 1; j < raw.length && !raw[j].startsWith('@@') && !raw[j].startsWith('diff --git'); j++) {
        if (!raw[j].startsWith('+')) olds++
        if (!raw[j].startsWith('-')) news++
      }
      n = Number(newStart)
      lines.push({ kind: 'hunk', text: `@@ -${oldStart},${olds} +${newStart},${news} @@${rest}` })
    } else if (line.startsWith('+')) {
      lines.push({ kind: 'add', text: line.slice(1), n: n++ })
    } else if (line.startsWith('-')) {
      lines.push({ kind: 'del', text: line.slice(1) })
    } else {
      lines.push({ kind: 'ctx', text: line.slice(1), n: n++ })
    }
  }
  return lines
}

/** The files the pull request touches: those shown, and the rest, as the file tree lists them. */
export const prFiles = [
  ...diff.split('\n').filter((line) => line.startsWith('diff --git')).map((line) => line.split(' b/')[1]),
  'backend/contexts/boards/modules/card/events/card-due-date-set.ts',
  'backend/contexts/boards/modules/card/card-options.ts',
  'backend/contexts/boards/initialize-modules.ts',
  'backend/contexts/boards/mcp/tools/card-tools.ts',
  'backend/contexts/boards/search/card-index.ts',
  'backend/contexts/boards/modules/activity/activity.workers.ts',
  'backend/contexts/boards/modules/activity/activity.module.ts',
  'backend/contexts/notifications/notifications.context.ts',
  'backend/contexts/notifications/initialize-modules.ts',
  'backend/contexts/notifications/modules/notification/notification.ts',
  'backend/contexts/notifications/modules/notification/notification.schema.ts',
  'backend/contexts/notifications/modules/notification/notification.test.ts',
  'backend/contexts/notifications/modules/digest/digest.workers.ts',
  'backend/contexts/notifications/modules/digest/weekly-email.tsx',
  'backend/contexts/notifications/migrations/0007_notification_payload.sql',
  'backend/shared/mailer/mailer.ts',
  'backend/shared/dates/group-by.ts',
  'backend/config.ts',
  'web/src/features/cards/use-set-due-date.ts',
  'web/src/features/cards/CardDetail.tsx',
  'web/src/features/cards/card-api.ts',
  'web/src/components/ui/calendar.tsx',
  'web/src/components/ui/popover.tsx',
  'web/src/i18n/en.json',
  'web/src/i18n/es.json',
  'web/package.json',
  'bun.lock',
  'docs/cards.md',
  'e2e/cards-due-date.spec.ts',
  'e2e/fixtures/boards.ts',
  'web/src/features/boards/BoardView.tsx',
  'web/src/features/cards/CardFilters.tsx',
  'backend/contexts/boards/modules/card/card.repository.ts',
]
