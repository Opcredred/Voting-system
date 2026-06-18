export interface Candidate {
  id: string;
  name: string;
}

export interface Campaign {
  id: string;
  name: string;
  captains: Candidate[];
  viceCaptains: Candidate[];
  finished?: boolean;
  results?: {
    totalVotes: number;
    captainVotes: Record<string, number>;
    viceCaptainVotes: Record<string, number>;
    categoryVotes?: Record<string, { captainVotes: Record<string, number>; viceCaptainVotes: Record<string, number> }>;
  };
}

export interface Ballot {
  id: string; // 6 char token
  authorized: boolean;
  locked: boolean;
  hasVoted: boolean; // if it has cast a vote already during its current unlocked state
  category: string;
  campaign?: Campaign;
  cuId?: string;
  ended?: boolean;
}

export interface Block {
  index: number;
  timestamp: number;
  previousHash: string;
  hash: string;
  data: {
    token: string;
    category: string;
    campaignId: string;
    captain: string;
    viceCaptain: string;
  };
}

export interface ControlUnitVoteView {
  token: string;
  category: string;
  campaignId: string;
  captain: string;
  viceCaptain: string;
  transactionHash: string;
}
