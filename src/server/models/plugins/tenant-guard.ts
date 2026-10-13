import { Types, type Aggregate, type Query, type Schema } from 'mongoose';

type CrossTenantOpt = { crossTenant?: boolean };

const QUERY_OPS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'updateOne',
  'updateMany',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'countDocuments',
  'distinct',
] as const;

const OBJECT_ID_HEX = /^[a-f0-9]{24}$/i;

/**
 * True only for a concrete tenant id. Operator objects such as `{ $ne: null }` or
 * `{ $exists: true }` are non-null but match every tenant, so they are rejected.
 */
const hasTenant = (obj: unknown) => {
  const tenantId = (obj as { tenantId?: unknown } | null | undefined)?.tenantId;
  return tenantId instanceof Types.ObjectId || (typeof tenantId === 'string' && OBJECT_ID_HEX.test(tenantId));
};

// Stages that read another collection, bypassing the first-stage tenant $match.
const CROSS_COLLECTION_STAGES = ['$lookup', '$unionWith', '$graphLookup'];

/**
 * Rejects any query on a tenant-owned model whose filter lacks `tenantId`.
 * `findById(id)` therefore throws; callers must use `findOne({ _id, tenantId })`,
 * which closes IDOR by construction.
 *
 * Cross-tenant system jobs (sweepers, billing) opt out explicitly and greppably:
 *   Model.updateMany(filter, update).setOptions({ crossTenant: true })
 */
export function tenantGuard(schema: Schema) {
  schema.pre([...QUERY_OPS], { query: true, document: false }, function (this: Query<unknown, unknown>) {
    if ((this.getOptions() as CrossTenantOpt).crossTenant) return;
    if (!hasTenant(this.getFilter())) {
      const op = (this as unknown as { op?: string }).op; // runtime property, untyped in Mongoose 9
      throw new Error(`tenantGuard: ${this.model.modelName}.${op} without tenantId in filter`);
    }
  });

  schema.pre('aggregate', function (this: Aggregate<unknown>) {
    if ((this.options as CrossTenantOpt).crossTenant) return;
    const pipeline = this.pipeline() as unknown as Array<Record<string, unknown>>;
    if (!hasTenant(pipeline[0]?.$match)) {
      throw new Error('tenantGuard: aggregate pipeline must start with { $match: { tenantId } }');
    }
    const crossStage = pipeline.find((stage) => CROSS_COLLECTION_STAGES.some((op) => op in stage));
    if (crossStage) {
      throw new Error(`tenantGuard: ${Object.keys(crossStage)[0]} requires { crossTenant: true }`);
    }
  });

  schema.pre('insertMany', function (docs: unknown) {
    const list = Array.isArray(docs) ? docs : [docs];
    if (!list.every(hasTenant)) throw new Error('tenantGuard: insertMany document without tenantId');
  });

  schema.pre('bulkWrite', function (ops) {
    for (const op of ops as Array<Record<string, { filter?: unknown; document?: unknown }>>) {
      const [kind, body] = Object.entries(op)[0] ?? [];
      const ok = kind === 'insertOne' ? hasTenant(body?.document) : hasTenant(body?.filter);
      if (!ok) throw new Error(`tenantGuard: bulkWrite ${kind} without tenantId`);
    }
  });
}
