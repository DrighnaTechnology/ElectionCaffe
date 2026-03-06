import { logger } from '../index.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WidgetDataSource {
  model: string;
  operation: 'count' | 'groupBy' | 'findMany' | 'aggregate';
  where?: Record<string, any>;
  by?: string[];
  _count?: Record<string, boolean>;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _max?: Record<string, boolean>;
  orderBy?: Record<string, string> | Record<string, string>[];
  take?: number;
  select?: Record<string, boolean>;
}

export interface DashboardWidget {
  id: string;
  type: 'stat-card' | 'bar' | 'pie' | 'line' | 'area' | 'radar' | 'table';
  title: string;
  size: 'full' | 'half' | 'third';
  dataSource: WidgetDataSource;
  chartConfig: Record<string, any>;
}

export interface DashboardConfig {
  title: string;
  description?: string;
  widgets: DashboardWidget[];
}

// ── Security: allowed models and fields ──────────────────────────────────────

const ALLOWED_MODELS: Record<string, string[]> = {
  voter: [
    'id', 'electionId', 'partId', 'sectionId', 'boothId', 'familyId',
    'epicNumber', 'slNumber', 'name', 'nameLocal', 'fatherName',
    'gender', 'age', 'dateOfBirth',
    'religionId', 'casteCategoryId', 'casteId', 'subCasteId', 'languageId',
    'profession', 'education',
    'partyId', 'voterCategoryId', 'politicalLeaning', 'influenceLevel',
    'isFamilyCaptain', 'isDead', 'isShifted', 'isDoubleEntry',
    'isMobileVerified', 'isAadhaarVerified',
    'pulseScore', 'createdAt', 'updatedAt',
  ],
  part: [
    'id', 'electionId', 'partNumber', 'boothName', 'boothNameLocal',
    'partType', 'address', 'landmark', 'pincode',
    'totalVoters', 'totalSections', 'maleVoters', 'femaleVoters', 'otherVoters',
    'isVulnerable', 'vulnerability', 'createdAt', 'updatedAt',
  ],
  booth: [
    'id', 'electionId', 'partId', 'boothNumber', 'boothName',
    'totalVoters', 'maleVoters', 'femaleVoters', 'otherVoters',
    'vulnerabilityStatus', 'isActive', 'createdAt', 'updatedAt',
  ],
  section: [
    'id', 'electionId', 'partId', 'sectionNumber', 'sectionName',
    'totalVoters', 'isActive', 'createdAt', 'updatedAt',
  ],
  family: [
    'id', 'electionId', 'partId', 'familyName', 'headName',
    'totalMembers', 'partyAffiliation', 'supportLevel',
    'createdAt', 'updatedAt',
  ],
  cadre: [
    'id', 'electionId', 'cadreType', 'designation', 'zone',
    'sector', 'ward', 'locality', 'targetVoters',
    'isActive', 'joinedAt', 'createdAt', 'updatedAt',
  ],
  candidate: [
    'id', 'electionId', 'name', 'nameLocal', 'partyId',
    'isOurCandidate', 'age', 'gender', 'education', 'profession',
    'constituency', 'district', 'state', 'createdAt', 'updatedAt',
  ],
};

// Foreign key → related model + label field mapping for label resolution
const FK_LABEL_MAP: Record<string, { model: string; nameField: string }> = {
  religionId: { model: 'religion', nameField: 'religionName' },
  casteCategoryId: { model: 'casteCategory', nameField: 'categoryName' },
  casteId: { model: 'caste', nameField: 'casteName' },
  subCasteId: { model: 'subCaste', nameField: 'subCasteName' },
  languageId: { model: 'language', nameField: 'languageName' },
  partyId: { model: 'party', nameField: 'partyName' },
  voterCategoryId: { model: 'voterCategory', nameField: 'categoryName' },
  partId: { model: 'part', nameField: 'boothName' },
  boothId: { model: 'booth', nameField: 'boothName' },
  sectionId: { model: 'section', nameField: 'sectionName' },
};

// Blocked patterns in where clauses
const BLOCKED_KEYS = [
  '$queryRaw', '$executeRaw', '$queryRawUnsafe', '$executeRawUnsafe',
  '$transaction', '$connect', '$disconnect', '$runCommandRaw',
];

// ── Validation ───────────────────────────────────────────────────────────────

function validateModel(model: string): void {
  if (!ALLOWED_MODELS[model]) {
    throw new Error(`Model "${model}" is not allowed. Allowed: ${Object.keys(ALLOWED_MODELS).join(', ')}`);
  }
}

function validateFields(model: string, fields: string[]): void {
  const allowed = ALLOWED_MODELS[model];
  for (const field of fields) {
    if (!allowed.includes(field)) {
      throw new Error(`Field "${field}" is not allowed on model "${model}"`);
    }
  }
}

function sanitizeWhere(where: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(where)) {
    // Block dangerous keys
    if (BLOCKED_KEYS.includes(key)) {
      throw new Error(`Blocked key "${key}" in where clause`);
    }
    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Allow Prisma operators: gte, lte, gt, lt, in, notIn, contains, startsWith, endsWith, not, equals
      const allowedOps = ['gte', 'lte', 'gt', 'lt', 'in', 'notIn', 'contains', 'startsWith', 'endsWith', 'not', 'equals', 'mode'];
      const keys = Object.keys(value);
      const isOperatorObj = keys.every(k => allowedOps.includes(k));
      if (isOperatorObj) {
        sanitized[key] = value;
      } else {
        // Could be nested AND/OR or nested object filter
        if (key === 'AND' || key === 'OR' || key === 'NOT') {
          if (Array.isArray(value)) {
            sanitized[key] = value.map((v: any) => sanitizeWhere(v));
          } else {
            sanitized[key] = sanitizeWhere(value);
          }
        } else {
          sanitized[key] = sanitizeWhere(value);
        }
      }
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ── Query Executor ───────────────────────────────────────────────────────────

export async function executeWidgetQuery(
  tenantDb: any,
  electionId: string,
  dataSource: WidgetDataSource,
): Promise<any> {
  const { model, operation, where = {}, by, _count, _sum, _avg, _min, _max, orderBy, take, select } = dataSource;

  // Validate model
  validateModel(model);

  // Sanitize where clause
  const sanitizedWhere = sanitizeWhere(where);

  // Force electionId injection for tenant isolation
  sanitizedWhere.electionId = electionId;

  // For voter queries, default to excluding dead/shifted unless explicitly querying them
  if (model === 'voter') {
    if (sanitizedWhere.isDead === undefined) sanitizedWhere.isDead = false;
    if (sanitizedWhere.isShifted === undefined) sanitizedWhere.isShifted = false;
  }

  const dbModel = tenantDb[model];
  if (!dbModel) {
    throw new Error(`Model "${model}" not found in database client`);
  }

  switch (operation) {
    case 'count': {
      const result = await dbModel.count({ where: sanitizedWhere });
      return result;
    }

    case 'groupBy': {
      if (!by || by.length === 0) {
        throw new Error('groupBy requires "by" field(s)');
      }
      validateFields(model, by);

      const groupByArgs: any = {
        by,
        where: sanitizedWhere,
      };
      if (_count) groupByArgs._count = _count;
      if (_sum) groupByArgs._sum = _sum;
      if (_avg) groupByArgs._avg = _avg;
      if (_min) groupByArgs._min = _min;
      if (_max) groupByArgs._max = _max;
      if (orderBy) groupByArgs.orderBy = orderBy;
      if (take) groupByArgs.take = Math.min(take, 1000);

      let results = await dbModel.groupBy(groupByArgs);

      // Resolve labels for foreign key fields
      results = await resolveForeignKeyLabels(tenantDb, electionId, by, results);

      return results;
    }

    case 'findMany': {
      const findArgs: any = {
        where: sanitizedWhere,
        take: Math.min(take || 100, 1000),
      };
      if (orderBy) findArgs.orderBy = orderBy;

      // Collect FK fields that were selected so we can resolve labels
      const selectedFkFields: string[] = [];

      if (select) {
        // Only allow boolean select (no nested relations)
        const safeSelect: Record<string, boolean> = {};
        const allowed = ALLOWED_MODELS[model];
        for (const [k, v] of Object.entries(select)) {
          if (typeof v === 'boolean' && v && allowed.includes(k)) {
            safeSelect[k] = true;
          }
        }

        // Only apply select if it has at least one field, otherwise omit (fetch all)
        if (Object.keys(safeSelect).length > 0) {
          findArgs.select = safeSelect;

          // Track which FK fields are selected
          for (const field of Object.keys(safeSelect)) {
            if (FK_LABEL_MAP[field]) {
              selectedFkFields.push(field);
            }
          }
        }
      }

      let results = await dbModel.findMany(findArgs);

      // Resolve FK labels for findMany results (e.g., boothId → boothName)
      if (selectedFkFields.length > 0 && results.length > 0) {
        results = await resolveForeignKeyLabels(tenantDb, electionId, selectedFkFields, results);
      }

      return results;
    }

    case 'aggregate': {
      const aggArgs: any = { where: sanitizedWhere };
      if (_count) aggArgs._count = _count;
      if (_sum) aggArgs._sum = _sum;
      if (_avg) aggArgs._avg = _avg;
      if (_min) aggArgs._min = _min;
      if (_max) aggArgs._max = _max;

      return await dbModel.aggregate(aggArgs);
    }

    default:
      throw new Error(`Unsupported operation: "${operation}"`);
  }
}

// ── Label Resolution ─────────────────────────────────────────────────────────

async function resolveForeignKeyLabels(
  tenantDb: any,
  electionId: string,
  byFields: string[],
  results: any[],
): Promise<any[]> {
  for (const field of byFields) {
    const mapping = FK_LABEL_MAP[field];
    if (!mapping) continue;

    const dbModel = tenantDb[mapping.model];
    if (!dbModel) continue;

    // Collect unique IDs
    const ids = [...new Set(results.map((r: any) => r[field]).filter(Boolean))];
    if (ids.length === 0) continue;

    // Fetch labels
    const records = await dbModel.findMany({
      where: { id: { in: ids }, electionId },
      select: { id: true, [mapping.nameField]: true },
    });

    // Build lookup
    const lookup: Record<string, string> = {};
    for (const rec of records) {
      lookup[rec.id] = rec[mapping.nameField] || rec.id;
    }

    // Inject label into results
    const labelKey = field.replace('Id', 'Name');
    for (const row of results) {
      if (row[field]) {
        row[labelKey] = lookup[row[field]] || 'Unknown';
      } else {
        row[labelKey] = 'Not Assigned';
      }
    }
  }

  return results;
}

// ── Execute all widgets in parallel ──────────────────────────────────────────

export async function executeAllWidgets(
  tenantDb: any,
  electionId: string,
  widgets: DashboardWidget[],
): Promise<Record<string, any>> {
  const entries = await Promise.all(
    widgets.map(async (widget) => {
      try {
        const data = await executeWidgetQuery(tenantDb, electionId, widget.dataSource);
        return [widget.id, { success: true, data }];
      } catch (err: any) {
        logger.error({ err, widgetId: widget.id }, '[Dashboard] Widget query failed');
        return [widget.id, { success: false, error: err.message }];
      }
    }),
  );
  return Object.fromEntries(entries);
}

// ── Validate dashboard config structure ──────────────────────────────────────

const VALID_WIDGET_TYPES = ['stat-card', 'bar', 'pie', 'line', 'area', 'radar', 'table'];
const VALID_SIZES = ['full', 'half', 'third'];

export function validateDashboardConfig(config: any): DashboardConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Dashboard config must be an object');
  }
  if (!config.title || typeof config.title !== 'string') {
    throw new Error('Dashboard config must have a title');
  }
  if (!Array.isArray(config.widgets) || config.widgets.length === 0) {
    throw new Error('Dashboard config must have at least one widget');
  }
  if (config.widgets.length > 24) {
    throw new Error('Dashboard config can have at most 24 widgets');
  }

  for (const widget of config.widgets) {
    if (!widget.id || !widget.type || !widget.title || !widget.dataSource) {
      throw new Error(`Widget missing required fields (id, type, title, dataSource)`);
    }
    if (!VALID_WIDGET_TYPES.includes(widget.type)) {
      throw new Error(`Invalid widget type: "${widget.type}"`);
    }
    if (widget.size && !VALID_SIZES.includes(widget.size)) {
      widget.size = 'half'; // fallback
    }
    if (!widget.size) widget.size = 'half';

    // Validate dataSource
    const ds = widget.dataSource;
    validateModel(ds.model);
    if (!['count', 'groupBy', 'findMany', 'aggregate'].includes(ds.operation)) {
      throw new Error(`Invalid operation: "${ds.operation}" in widget "${widget.id}"`);
    }
    // Sanitize by: only allow plain string field names, strip objects
    if (ds.by) {
      ds.by = ds.by.filter((field: any) => typeof field === 'string');
      if (ds.by.length > 0) {
        validateFields(ds.model, ds.by);
      }
    }
  }

  return config as DashboardConfig;
}
