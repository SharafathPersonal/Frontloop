/** URL value of the leads "Needs Human" view: bot-paused leads, newest customer message first. */
export const NEEDS_HUMAN_FILTER = 'needs_human';

export const LEAD_FILTERS = [
  { value: 'all', label: 'All' },
  { value: NEEDS_HUMAN_FILTER, label: 'Needs Human' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
] as const;
