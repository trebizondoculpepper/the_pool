/**
 * The owner's recorded audit rulings (mission 167): a room or a kind is
 * approved only when a ruling is written here, with its date and what was
 * decided; the audit never infers sign-off from an empty list of
 * findings. Empty until the owner rules on the first room. Pure.
 */
export interface AuditRuling {
  /** A room id or a kind key. */
  subject: string;
  /** ISO date of the owner's ruling. */
  date: string;
  /** What the owner decided, in a sentence. */
  decision: string;
}

export const AUDIT_RULINGS: readonly AuditRuling[] = [];

/** The owner's ruling on a room or kind, if there is one. */
export const rulingOf = (
  subject: string,
  rulings: readonly AuditRuling[] = AUDIT_RULINGS,
): AuditRuling | undefined => rulings.find((r) => r.subject === subject);
