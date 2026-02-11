import { LeagueEntry } from '../types/league';

export const mockLeagueDataMonthly: LeagueEntry[] = [
  {
    rank: 1,
    userId: '1',
    userName: 'Delvis Echeverria',
    totalPoints: 487,
    pointsBreakdown: {
      explorers: 95,
      contributors: 325,
      detectors: 67
    },
    currentTier: 'Hurricane',
    monthlyWins: ['Feb 2025', 'Jan 2025', 'Dec 2024'],
    delta: 0
  },
  {
    rank: 2,
    userId: '2',
    userName: 'Sarah Chen',
    totalPoints: 312,
    pointsBreakdown: {
      explorers: 78,
      contributors: 189,
      detectors: 45
    },
    currentTier: 'Storm',
    monthlyWins: ['Nov 2024'],
    delta: 1
  },
  {
    rank: 3,
    userId: '3',
    userName: 'Marcus Johnson',
    totalPoints: 298,
    pointsBreakdown: {
      explorers: 103,
      contributors: 142,
      detectors: 53
    },
    currentTier: 'Storm',
    monthlyWins: ['Oct 2024', 'Sep 2024'],
    delta: -1
  },
  {
    rank: 4,
    userId: '4',
    userName: 'Ana Rodríguez',
    totalPoints: 245,
    pointsBreakdown: {
      explorers: 87,
      contributors: 98,
      detectors: 60
    },
    currentTier: 'Storm',
    monthlyWins: [],
    delta: 2
  },
  {
    rank: 5,
    userId: '5',
    userName: 'David Kim',
    totalPoints: 189,
    pointsBreakdown: {
      explorers: 71,
      contributors: 85,
      detectors: 33
    },
    currentTier: 'Storm',
    monthlyWins: ['Aug 2024'],
    delta: 0
  },
  {
    rank: 6,
    userId: '6',
    userName: 'Emma Wilson',
    totalPoints: 142,
    pointsBreakdown: {
      explorers: 89,
      contributors: 38,
      detectors: 15
    },
    currentTier: 'Thunder',
    monthlyWins: [],
    delta: -2
  },
  {
    rank: 7,
    userId: '7',
    userName: 'Raj Patel',
    totalPoints: 98,
    pointsBreakdown: {
      explorers: 78,
      contributors: 12,
      detectors: 8
    },
    currentTier: 'Thunder',
    monthlyWins: [],
    delta: 1
  },
  {
    rank: 8,
    userId: '8',
    userName: 'Lisa Anderson',
    totalPoints: 67,
    pointsBreakdown: {
      explorers: 51,
      contributors: 10,
      detectors: 6
    },
    currentTier: 'Bolt',
    monthlyWins: [],
    delta: 0
  },
  {
    rank: 9,
    userId: '9',
    userName: 'Tom Martinez',
    totalPoints: 45,
    pointsBreakdown: {
      explorers: 38,
      contributors: 5,
      detectors: 2
    },
    currentTier: 'Bolt',
    monthlyWins: [],
    delta: -1
  },
  {
    rank: 10,
    userId: '10',
    userName: 'Nina Kowalski',
    totalPoints: 23,
    pointsBreakdown: {
      explorers: 20,
      contributors: 2,
      detectors: 1
    },
    currentTier: 'Bolt',
    monthlyWins: [],
    delta: 1
  }
];

export const mockLeagueDataAllTime: LeagueEntry[] = [
  {
    rank: 1,
    userId: '1',
    userName: 'Delvis Echeverria',
    totalPoints: 1847,
    pointsBreakdown: {
      explorers: 421,
      contributors: 987,
      detectors: 439
    },
    currentTier: 'Hurricane',
    monthlyWins: ['Feb 2025', 'Jan 2025', 'Dec 2024', 'Nov 2024'],
    delta: 0
  },
  {
    rank: 2,
    userId: '2',
    userName: 'Sarah Chen',
    totalPoints: 1523,
    pointsBreakdown: {
      explorers: 356,
      contributors: 845,
      detectors: 322
    },
    currentTier: 'Hurricane',
    monthlyWins: ['Oct 2024', 'Sep 2024'],
    delta: 0
  },
  {
    rank: 3,
    userId: '3',
    userName: 'Marcus Johnson',
    totalPoints: 1289,
    pointsBreakdown: {
      explorers: 478,
      contributors: 567,
      detectors: 244
    },
    currentTier: 'Hurricane',
    monthlyWins: ['Aug 2024', 'Jul 2024', 'Jun 2024'],
    delta: 1
  },
  {
    rank: 4,
    userId: '4',
    userName: 'Ana Rodríguez',
    totalPoints: 1045,
    pointsBreakdown: {
      explorers: 387,
      contributors: 423,
      detectors: 235
    },
    currentTier: 'Hurricane',
    monthlyWins: ['May 2024'],
    delta: -1
  },
  {
    rank: 5,
    userId: '5',
    userName: 'David Kim',
    totalPoints: 876,
    pointsBreakdown: {
      explorers: 298,
      contributors: 412,
      detectors: 166
    },
    currentTier: 'Storm',
    monthlyWins: ['Apr 2024', 'Mar 2024'],
    delta: 0
  },
  {
    rank: 6,
    userId: '6',
    userName: 'Emma Wilson',
    totalPoints: 654,
    pointsBreakdown: {
      explorers: 345,
      contributors: 201,
      detectors: 108
    },
    currentTier: 'Storm',
    monthlyWins: [],
    delta: 1
  },
  {
    rank: 7,
    userId: '7',
    userName: 'Raj Patel',
    totalPoints: 523,
    pointsBreakdown: {
      explorers: 289,
      contributors: 167,
      detectors: 67
    },
    currentTier: 'Storm',
    monthlyWins: ['Feb 2024'],
    delta: -1
  },
  {
    rank: 8,
    userId: '8',
    userName: 'Lisa Anderson',
    totalPoints: 398,
    pointsBreakdown: {
      explorers: 234,
      contributors: 112,
      detectors: 52
    },
    currentTier: 'Thunder',
    monthlyWins: [],
    delta: 0
  },
  {
    rank: 9,
    userId: '9',
    userName: 'Tom Martinez',
    totalPoints: 267,
    pointsBreakdown: {
      explorers: 178,
      contributors: 65,
      detectors: 24
    },
    currentTier: 'Thunder',
    monthlyWins: [],
    delta: 1
  },
  {
    rank: 10,
    userId: '10',
    userName: 'Nina Kowalski',
    totalPoints: 145,
    pointsBreakdown: {
      explorers: 98,
      contributors: 34,
      detectors: 13
    },
    currentTier: 'Bolt',
    monthlyWins: [],
    delta: -1
  }
];