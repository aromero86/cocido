/**
 * One request through cooper, end to end: someone deletes a card. Excerpts of its real
 * files, in the order they run, trimmed (`…`) and wrapped to fit a narrow screen: no
 * line is longer than 46 characters.
 */
export const blocksCode: Record<string, { file: string; code: string }> = {
  route: {
    file: 'card/card.routes.ts',
    code: `export function registerCardRoutes(
  base: BoardsBase,
  cards: Card_Module,
  deps: Card_Deps,
) {
  const workspace =
    workspaceRoutes(base, deps.member)
  …
  workspace.delete('/cards/:cardId',
    async request => {
      await cards.delete(request.params.cardId)
      return new Response(null, { status: 204 })
    })
}`,
  },
  useCase: {
    file: 'card/card.module.ts',
    code: `export class Card_Module extends Module {
  /** Deletes it: the cards under it move up. */
  @UseCase()
  async delete(id: string): Promise<void> {
    const card = await this.load(id)
    const others = (
      await this.repo.inColumn(card.columnId)
    ).filter(each => each.id !== id)
    others.forEach((each, index) =>
      each.reposition(index))
    card.delete(actingAuthor())
    await this.repo.persistOrder(
      [card, ...others],
      [card.columnId],
    )
  }
}`,
  },
  entity: {
    file: 'card/card.ts',
    code: `/** A card of a board. */
export class Card
  extends Entity<typeof CardSchema> {
  reposition(position: number): void {
    this.change({ position })
  }

  delete(author: CardAuthor): void {
    this.markAsDeleted()
    this.trackEvent(new Card_Deleted({
      ...this.toDTO(),
      ...author,
    }))
  }
}`,
  },
  repository: {
    file: 'card/card.repository.ts',
    code: `export class Card_Repository extends
  TableRepository<Card, CardRow, BoardsBase> {
  /** The cards and what they tell: at once. */
  async persistOrder(
    cards: Card[],
    columnIds: string[],
  ) {
    const columns = [...new Set(columnIds)]
    await this.save(cards, each =>
      this.write(each), {
      guard: columns.map(columnId =>
        \`cards:\${columnId}\`),
      after: async () => {
        for (const columnId of columns) {
          const positions =
            (await this.inColumn(columnId))
              .map(card => card.position)
          if (positions.some((position, index) =>
            position !== index)) this.conflict()
        }
      },
    })
  }
}`,
  },
  event: {
    file: 'card/events/card-deleted.ts',
    code: `/** The card as it was, and who deleted it. */
type CardDeletion = CardDTO & CardAuthor

export class Card_Deleted
  implements DomainEvent<CardDeletion> {
  static readonly eventName = 'card.deleted'
  readonly name = Card_Deleted.eventName
  readonly occurredAt = now().toISOString()
  constructor(
    readonly payload: CardDeletion,
  ) {}
}`,
  },
  worker: {
    file: 'attachment/attachment.workers.ts',
    code: `/** Each a saved job, safe to run again. */
export function registerAttachmentWorkers(
  attachments: Attachment_Module,
  deps: Attachment_Deps,
) {
  deps.card.events.deleted.subscribe(
    ({ workspaceId, id }) =>
      attachments.removeOfCard(workspaceId, id),
    {
      strategy: 'handler',
      queue: '…removeOfCard.on.card.deleted',
    },
  )
  …
}`,
  },
  reaction: {
    file: 'attachment/attachment.module.ts',
    code: `export class Attachment_Module
  extends Module {
  /** From a worker: the card went, files go. */
  @UseCase()
  async removeOfCard(
    workspaceId: string,
    cardId: string,
  ) {
    await runInWorkspace(workspaceId, () =>
      this.removeAll(() =>
        this.repo.find({ cardId })))
  }

  private async removeAll(find: …) {
    const found = await find()
    found.forEach(a => a.remove())
    if (found.length > 0) {
      await this.repo.persist(...found)
    }
  }
}`,
  },
  scheduler: {
    file: 'attachment/attachment.module.ts',
    code: `export class Attachment_Module
  extends Module {
  /** Told once an hour. */
  readonly hourly

  private constructor(base: BoardsBase, …) {
    …
    this.hourly = base.schedules.define(
      'attachment.hourly', '0 * * * *')
  }

  /** Uploads left halfway, over an hour ago. */
  @UseCase()
  async sweepPending(): Promise<void> { … }
}

// attachment.workers.ts
attachments.hourly.subscribe(
  () => attachments.sweepPending(),
  { strategy: 'handler', queue: '…' },
)`,
  },
}
