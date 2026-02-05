import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Election {
  id: string;
  name: string;
  nameLocal?: string;
  electionType: string;
  status: string;
  state: string;
  constituency: string;
  totalVoters: number;
  totalBooths: number;
}

interface ElectionState {
  currentElection: Election | null;
  elections: Election[];
  selectedElectionId: string | null;
  setCurrentElection: (election: Election | null) => void;
  setElections: (elections: Election[]) => void;
  setSelectedElection: (electionId: string | null) => void;
}

export const useElectionStore = create<ElectionState>()(
  persist(
    (set) => ({
      currentElection: null,
      elections: [],
      selectedElectionId: null,

      setCurrentElection: (election) =>
        set({ currentElection: election }),

      setElections: (elections) =>
        set({ elections }),

      setSelectedElection: (electionId) =>
        set({ selectedElectionId: electionId }),
    }),
    {
      name: 'electioncaffe-election',
    }
  )
);
