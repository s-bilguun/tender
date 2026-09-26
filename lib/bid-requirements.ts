import { BidRequirementSummary, TenderItem } from './types';

/**
 * Requirements are not derivable from a tender's budget or category. Keep this
 * helper intentionally empty until a requirement has been extracted from its
 * official dossier and can be tied to evidence.
 */
export function generateBidRequirements(_tender: Partial<TenderItem>): BidRequirementSummary {
  return {
    estimatedGuaranteeMin: null,
    estimatedGuaranteeMax: null,
    isElectronic: null,
    requiredClearances: [],
    submissionSteps: [],
    evidenceStatus: 'not_processed',
  };
}
