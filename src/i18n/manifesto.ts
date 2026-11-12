import type { Lang } from './landing'

/** The manifesto's text. A first draft: the theses are the author's to rewrite. */
const en = {
  meta: {
    title: 'cocido’s principles',
    description: 'On keeping control of software we no longer write by hand.',
  },
  place: 'Málaga, November 2026',
  title: 'On keeping control of software we no longer write by hand',
  opening: [
    'To whoever builds with agents.',
    'Writing code is no longer the bottleneck. Keeping control of what gets generated is. A machine writes in ten minutes what takes a person an afternoon to read, and nobody has an afternoon for every change. Some teams approve unread, and a system grows that nobody, neither its people nor its agents, can explain. Others review everything, carry the pressure of every review, and move slowly.',
    'This project is a humble attempt, and an experiment too, at building software fast in a healthy way. These are the ideas it comes from.',
  ],
  theses: [
    { title: 'If you don’t know how it works, you don’t control it.', text: 'Approving unread is delegating without knowing it.' },
    { title: 'What you approve is yours.', text: 'AI can’t take responsibility for you. You approved it.' },
    { title: 'Understand how the system works, not every detail.', text: 'The machine writes the lines. A person decides the shape, and checks it.' },
    { title: 'The plan comes before the code.', text: 'And the code is held against the plan, not against the reviewer’s hunch.' },
    { title: 'Boundaries are written in code, not in a wiki.', text: 'An agent doesn’t read the wiki. It does obey the lint.' },
    { title: 'Predictable code.', text: 'What the AI generates should be what you expected it to generate. One way to do each thing is what makes that possible.' },
    { title: 'A system must be able to draw itself.', text: 'If its parts and how they meet cannot be drawn from the code, nobody can review a change to them.' },
    { title: 'What happened is never lost.', text: 'A change and the news of it leave together, or neither does.' },
    { title: 'Production speaks the domain’s language.', text: 'If you don’t know what it does in production, you don’t know what you wrote.' },
    { title: 'Supervision is a loop, not a gate.', text: 'What production shows goes back as the next plan.' },
  ],
  signature: 'Angel Romero',
  start: 'Start building',
  back: 'Back home',
}

export type ManifestoCopy = typeof en

const es: ManifestoCopy = {
  meta: {
    title: 'Los principios de cocido',
    description: 'Sobre el control del software que ya no escribimos a mano.',
  },
  place: 'Málaga, noviembre de 2026',
  title: 'Sobre el control del software que ya no escribimos a mano',
  opening: [
    'A quien construya con agentes.',
    'Escribir código ha dejado de ser el cuello de botella. Ahora lo es mantener el control de lo que se genera. Una máquina escribe en diez minutos lo que una persona tarda una tarde en leer, y nadie tiene una tarde para cada cambio. Unos equipos aprueban sin leer, y crece un sistema que nadie, ni sus personas ni sus agentes, sabe explicar. Otros lo revisan todo, cargan con la presión de cada review y avanzan despacio.',
    'Este proyecto es un humilde intento, y a la vez un experimento, de construir software rápido de una manera saludable. Estas son las ideas de las que sale.',
  ],
  theses: [
    { title: 'Si no sabes cómo funciona, no lo controlas.', text: 'Aprobar sin leer es delegar sin saberlo.' },
    { title: 'Lo que apruebas es tuyo.', text: 'La IA no puede responsabilizarse por ti. Tú lo aprobaste.' },
    { title: 'Entiende cómo funciona el sistema, no cada detalle.', text: 'Las líneas las escribe la máquina. La forma la decide una persona, y la comprueba.' },
    { title: 'El plan va antes que el código.', text: 'Y el código se contrasta con el plan, no con la intuición de quien revisa.' },
    { title: 'Las fronteras se escriben en el código, no en un wiki.', text: 'Un agente no lee el wiki. La lint, sí la cumple.' },
    { title: 'Código predecible.', text: 'Que lo que genere la IA sea lo que esperabas que generase. Tener una sola forma de hacer cada cosa es lo que lo hace posible.' },
    { title: 'Un sistema tiene que poder dibujarse a sí mismo.', text: 'Si sus partes y cómo se tocan no se pueden dibujar desde el código, nadie puede revisar un cambio en ellas.' },
    { title: 'Lo que pasó no se pierde nunca.', text: 'Un cambio y la noticia de ese cambio salen juntos, o no sale ninguno.' },
    { title: 'Producción habla el idioma del dominio.', text: 'Si no sabes qué hace en producción, no sabes qué escribiste.' },
    { title: 'Supervisar es un ciclo, no una puerta.', text: 'Lo que enseña producción vuelve como el siguiente plan.' },
  ],
  signature: 'Angel Romero',
  start: 'Empezar a construir',
  back: 'Volver al inicio',
}

export const manifesto: Record<Lang, ManifestoCopy> = { en, es }
