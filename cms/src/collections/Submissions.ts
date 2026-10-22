import { APIError, type CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor } from '../access/permissions'
import { visualizationSettingsFromEnv } from '../lib/submissions/config'
import { CONTACT_TOPICS, RING_SIZE_KNOWN, type RingSizeKnownId } from '../lib/submissions/options'
import { guardVisualizationTransition } from '../lib/submissions/queue'
import {
  NOTIFICATION_STATUSES,
  SUBMISSION_KINDS,
  SUBMISSION_STATUSES,
  VERIFICATION_STATUSES,
  VISUALIZATION_STATUSES,
  type SubmissionKind,
  type VisualizationStatus,
} from '../lib/submissions/statuses'

const readOnly = { readOnly: true }
// Grawer i rozmiar z formularza kontaktowego (temat „na zamówienie” albo „z kolekcji”); kreator ma je w karcie projektu.
const contactOnly = (data: Partial<{ kind: SubmissionKind }>) => data?.kind === 'contact'
const RING_SIZE_KNOWN_LABELS: Record<RingSizeKnownId, string> = {
  known: 'Zna rozmiar',
  unknown: 'Nie zna – zmierzymy w pracowni',
}

export const Submissions: CollectionConfig = {
  slug: 'submissions',
  dbName: 'cms_submissions',
  labels: {
    singular: 'Zgłoszenie',
    plural: 'Zgłoszenia',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: [
      'name',
      'kind',
      'phone',
      'status',
      'verification',
      'visualizationStatus',
      'createdAt',
    ],
    group: 'Zgłoszenia',
    listSearchableFields: ['name', 'phone', 'email'],
    description:
      'Zgłoszenia z kreatora i formularza kontaktowego. Każde zapisuje się jako szkic; do klienta nic nie wychodzi automatycznie. Wizualizację uruchamia pomocnik dopiero po zatwierdzeniu, w granicach dziennego limitu.',
  },
  defaultSort: '-createdAt',
  access: {
    // Zgłoszenia tworzy tylko endpoint /api/zgloszenia (Local API); publiczne REST /api/submissions jest zamknięte.
    create: () => false,
    read: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const next = data.visualizationStatus as VisualizationStatus | undefined
        if (operation === 'create') {
          if (next === 'in_progress' || next === 'done' || next === 'failed') {
            throw new APIError(
              'Nowe zgłoszenie nie może mieć uruchomionej wizualizacji.',
              400,
              null,
              true,
            )
          }
          return data
        }
        const previous = originalDoc?.visualizationStatus as VisualizationStatus | undefined
        if (next === undefined || next === previous) return data
        const patch = await guardVisualizationTransition({
          payload: req.payload,
          settings: visualizationSettingsFromEnv(),
          kind: (data.kind ?? originalDoc?.kind) as SubmissionKind,
          previous,
          next,
          now: new Date(),
        })
        return { ...data, ...patch }
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Imię',
          required: true,
          admin: { ...readOnly, width: '33%' },
        },
        {
          name: 'phone',
          type: 'text',
          label: 'Telefon',
          required: true,
          admin: { ...readOnly, width: '33%' },
        },
        { name: 'email', type: 'text', label: 'E-mail', admin: { ...readOnly, width: '33%' } },
      ],
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Karta projektu / szczegóły',
      admin: readOnly,
    },
    {
      name: 'message',
      type: 'textarea',
      label: 'Wiadomość od klienta',
      admin: readOnly,
    },
    {
      type: 'row',
      admin: { condition: contactOnly },
      fields: [
        {
          name: 'engraving',
          type: 'text',
          label: 'Grawer',
          admin: { ...readOnly, width: '33%' },
        },
        {
          name: 'ringSizeKnown',
          type: 'select',
          label: 'Rozmiar',
          options: RING_SIZE_KNOWN.map((o) => ({
            label: RING_SIZE_KNOWN_LABELS[o.id],
            value: o.id,
          })),
          admin: { ...readOnly, width: '33%' },
        },
        {
          name: 'ringSize',
          type: 'text',
          label: 'Rozmiar (polska skala)',
          admin: {
            ...readOnly,
            width: '33%',
            description: 'Obwód wewnętrzny w mm minus 40, np. 14 = 54 mm.',
          },
        },
      ],
    },
    {
      name: 'details',
      type: 'json',
      label: 'Wybory (dane dla pomocnika)',
      admin: {
        ...readOnly,
        description: 'Sprawdzone przez serwer wartości z kreatora lub formularza.',
      },
    },
    {
      type: 'collapsible',
      label: 'Zgoda i dane techniczne',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'consentText',
          type: 'text',
          label: 'Treść zgody',
          required: true,
          admin: readOnly,
        },
        {
          name: 'consentAt',
          type: 'date',
          label: 'Zgoda wyrażona',
          required: true,
          admin: { ...readOnly, date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'meta',
          type: 'group',
          label: 'Dane techniczne',
          fields: [
            {
              name: 'ipHash',
              type: 'text',
              label: 'Skrót adresu IP (sam adres nie jest zapisywany)',
              admin: readOnly,
            },
            { name: 'userAgent', type: 'text', label: 'Przeglądarka', admin: readOnly },
            { name: 'fillSeconds', type: 'number', label: 'Czas wypełnienia (s)', admin: readOnly },
            {
              name: 'verifiedWithTestKeys',
              type: 'checkbox',
              label: 'Zweryfikowane kluczem testowym Turnstile',
              admin: readOnly,
            },
          ],
        },
      ],
    },
    {
      name: 'kind',
      type: 'select',
      label: 'Źródło',
      required: true,
      index: true,
      options: [...SUBMISSION_KINDS],
      admin: { ...readOnly, position: 'sidebar' },
    },
    {
      name: 'topic',
      type: 'select',
      label: 'Temat (formularz kontaktowy)',
      options: CONTACT_TOPICS.map((t) => ({ label: t.label, value: t.id })),
      admin: { ...readOnly, position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status zgłoszenia',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [...SUBMISSION_STATUSES],
      admin: { position: 'sidebar' },
    },
    {
      name: 'verification',
      type: 'select',
      label: 'Weryfikacja',
      required: true,
      defaultValue: 'verified',
      index: true,
      options: [...VERIFICATION_STATUSES],
      admin: {
        ...readOnly,
        position: 'sidebar',
        description:
          'Kwarantanna: zgłoszenie przyszło, gdy Cloudflare Turnstile był niedostępny. Sprawdź, czy to nie spam; wizualizacja tylko po ręcznym zatwierdzeniu.',
      },
    },
    {
      name: 'visualizationStatus',
      type: 'select',
      label: 'Wizualizacja',
      required: true,
      defaultValue: 'not_applicable',
      index: true,
      options: [...VISUALIZATION_STATUSES],
      admin: {
        position: 'sidebar',
        description:
          'Zatwierdź („Zatwierdzona – w kolejce”), żeby pomocnik mógł przygotować wizualizację. Dzienny limit uruchomień jest twardy; nadmiar czeka w kolejce.',
      },
    },
    {
      name: 'visualizationStartedAt',
      type: 'date',
      label: 'Wizualizacja uruchomiona',
      admin: { ...readOnly, position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'visualizationFinishedAt',
      type: 'date',
      label: 'Wizualizacja zakończona',
      admin: { ...readOnly, position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'notification',
      type: 'select',
      label: 'Powiadomienie pracowni',
      defaultValue: 'pending',
      options: [...NOTIFICATION_STATUSES],
      admin: { ...readOnly, position: 'sidebar' },
    },
  ],
}
