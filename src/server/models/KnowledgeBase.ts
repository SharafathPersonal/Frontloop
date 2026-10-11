import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { tenantGuard } from './plugins/tenant-guard';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_KB_CHARS = 60_000; // full-KB prompt injection budget (~15k tokens)

export const CAPTURE_FIELDS = ['name', 'requirement', 'preferred_time', 'email'] as const;

const SlotSchema = new Schema(
  {
    open: { type: String, match: HHMM, required: true },
    close: { type: String, match: HHMM, required: true },
  },
  { _id: false },
);

const KnowledgeBaseSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'BusinessTenant', required: true },

    faqs: [
      {
        question: { type: String, required: true, trim: true, maxlength: 300 },
        answer: { type: String, required: true, trim: true, maxlength: 2000 },
        enabled: { type: Boolean, default: true },
      },
    ],

    services: [
      {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        description: { type: String, trim: true, maxlength: 500 },
        priceMinor: { type: Number, min: 0 }, // smallest currency unit (paise); never floats
        currency: { type: String, default: 'INR' },
        durationMin: { type: Number, min: 0 },
      },
    ],

    hours: {
      // Split shifts are multiple slots (e.g. 09:00–13:00 + 17:00–21:00).
      // Overnight shifts are stored as two slots across adjacent days.
      weekly: [
        {
          _id: false,
          day: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
          closed: { type: Boolean, default: false },
          slots: [SlotSchema],
        },
      ],
      exceptions: [
        {
          _id: false,
          date: { type: String, match: /^\d{4}-\d{2}-\d{2}$/, required: true },
          closed: { type: Boolean, default: true },
          slots: [SlotSchema],
          note: { type: String, maxlength: 200 },
        },
      ],
    },

    context: { type: String, maxlength: 8000, default: '' },

    bot: {
      persona: { type: String, maxlength: 500 },
      languages: { type: [String], default: ['en'] },
      fallbackReply: {
        type: String,
        maxlength: 500,
        default: 'Thanks for reaching out! Our team will get back to you shortly.',
      },
      handoffKeywords: { type: [String], default: ['human', 'agent', 'call me'] },
      captureFields: { type: [String], enum: CAPTURE_FIELDS, default: ['name', 'requirement'] },
    },

    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

KnowledgeBaseSchema.index({ tenantId: 1 }, { unique: true });

KnowledgeBaseSchema.pre('validate', function () {
  const size = JSON.stringify({ f: this.faqs, s: this.services, c: this.context }).length;
  if (size > MAX_KB_CHARS) throw new Error(`Knowledge base exceeds ${MAX_KB_CHARS} characters`);
});

KnowledgeBaseSchema.plugin(tenantGuard);

export type KnowledgeBaseDoc = InferSchemaType<typeof KnowledgeBaseSchema>;

export const KnowledgeBase: Model<KnowledgeBaseDoc> =
  (models.KnowledgeBase as Model<KnowledgeBaseDoc>) ??
  model<KnowledgeBaseDoc>('KnowledgeBase', KnowledgeBaseSchema);
