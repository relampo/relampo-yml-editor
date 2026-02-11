# Relampo League Component 🏆

## Overview

The **Relampo League** is a gamification system designed to drive adoption and reward real usage of the Relampo performance testing platform. It provides rankings, levels, badges, and bonus hours to motivate users.

**Key Feature**: Uses the official Relampo lightning bolt logo throughout for brand consistency.

## Components

### 1. `RelampoLeague` (Compact Widget)
- **Location**: `/components/RelampoLeague.tsx`
- **Purpose**: Compact leaderboard for dashboard display
- **Features**:
  - Top 10 users
  - Time range filtering (This month, Last 30 days, All time)
  - Metric toggle (Hours vs Runs)
  - Scope selector (Org, Team, Project)
  - Bonus hours info footer
  - "View full leaderboard" CTA

### 2. `RelampoLeagueExpanded` (Full View)
- **Location**: `/components/RelampoLeagueExpanded.tsx`
- **Purpose**: Full-screen modal with complete leaderboard
- **Features**:
  - Up to 50 users
  - Search functionality
  - Enhanced filtering
  - Detailed user information
  - Rewards banner

### 3. State Components
- **Location**: `/components/RelampoLeagueStates.tsx`
- **Components**:
  - `RelampoLeagueLoading`: Skeleton UI while data loads
  - `RelampoLeagueEmpty`: First-time user guidance

## Levels System

| Level | Hours Range | Bonus Hours | Visual |
|-------|-------------|-------------|--------|
| ⚡ Spark | 1-5h | - | Amber |
| 🔥 Bolt | 6-20h | +2h | Orange |
| ⛈️ Thunder | 21-50h | +5h | Purple |
| 🌪️ Storm | 51-100h | +10h | Blue |
| ⚡ Lightning | 100h+ | +20h | Cyan |

## Badges

- **Consistency**: 10+ active days
- **Regression Guardian**: Most CI runs
- **Signal Hunter**: Most anomalies/issues found
- **Scenario Builder**: Most scripts created/updated
- **Team Enabler**: Most templates shared
- **Clean Runner**: Highest valid run rate

## Data Structure

```typescript
interface LeagueEntry {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl?: string;
  metricValue: number; // hours or runs
  badges: LeagueBadge[];
  currentLevel: LeagueLevel;
  nextLevel?: LeagueLevel;
  progressToNext: number; // 0-100
  delta?: number; // change vs last period
}
```

## Usage

### Basic Implementation

```tsx
import { useState } from 'react';
import { RelampoLeague } from './components/RelampoLeague';
import { RelampoLeagueExpanded } from './components/RelampoLeagueExpanded';

function Dashboard() {
  const [showExpanded, setShowExpanded] = useState(false);

  return (
    <div>
      {/* Compact widget */}
      <RelampoLeague onViewFull={() => setShowExpanded(true)} />

      {/* Expanded modal */}
      {showExpanded && (
        <RelampoLeagueExpanded onClose={() => setShowExpanded(false)} />
      )}
    </div>
  );
}
```

### With Loading State

```tsx
import { RelampoLeagueLoading } from './components/RelampoLeagueStates';

function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);

  if (isLoading) {
    return <RelampoLeagueLoading />;
  }

  return <RelampoLeague onViewFull={...} />;
}
```

### With Empty State

```tsx
import { RelampoLeagueEmpty } from './components/RelampoLeagueStates';

function Dashboard() {
  const hasData = leagueEntries.length > 0;

  if (!hasData) {
    return <RelampoLeagueEmpty />;
  }

  return <RelampoLeague onViewFull={...} />;
}
```

## Mock Data

Mock data is provided in `/data/mockLeagueData.ts`:

- `mockLeagueDataHours`: Top 10 users by hours
- `mockLeagueDataRuns`: Top 10 users by runs
- `generateExtendedLeagueData(type, count)`: Generate larger datasets

## Customization

### Colors

Badge colors are defined in both components:

```typescript
const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Consistency': { 
    bg: 'bg-green-50', 
    text: 'text-green-700', 
    border: 'border-green-200' 
  },
  // ... other badges
};
```

### Level Colors

Level colors are defined in `/types/league.ts`:

```typescript
export const LEAGUE_LEVELS: LeagueLevelConfig[] = [
  { 
    name: 'Spark', 
    minHours: 1, 
    maxHours: 5, 
    bonusHours: 0, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50' 
  },
  // ... other levels
];
```

## Files Structure

```
/components
  ├── RelampoLeague.tsx              # Compact widget
  ├── RelampoLeagueExpanded.tsx      # Full modal view
  ├── RelampoLeagueStates.tsx        # Loading & empty states
  └── ComponentsShowcase.tsx         # Documentation/demo page

/types
  └── league.ts                       # TypeScript types & helpers

/data
  └── mockLeagueData.ts              # Mock data generators
```

## Design Principles

- **Enterprise & Minimal**: Clean typography, subtle shadows, rounded cards
- **Light-First**: Optimized for light mode with professional palette
- **Compact Yet Readable**: Works in widget and full-screen contexts
- **Progressive Disclosure**: Compact widget → Expanded view → Search/filter

## Integration Points

Currently integrated in:
- ✅ **Dashboard** (`/components/Dashboard.tsx`) - Right column, compact widget
- ✅ **Design Doc** (`/components/DesignDoc.tsx`) - "Relampo League" tab with showcase

## Next Steps (Backend Integration)

To connect to real data:

1. **API Endpoints Needed**:
   - `GET /api/league?timeRange=this-month&metric=hours&scope=org`
   - `GET /api/league/user/:userId` (for individual stats)

2. **Response Format**:
```json
{
  "entries": [
    {
      "rank": 1,
      "userId": "user-123",
      "userName": "Sarah Chen",
      "metricValue": 124,
      "badges": ["Consistency", "Signal Hunter"],
      "currentLevel": "Lightning",
      "nextLevel": null,
      "progressToNext": 100,
      "delta": 12
    }
  ],
  "totalUsers": 50
}
```

3. **Replace Mock Data**:
```tsx
const { data, isLoading, error } = useLeagueData({
  timeRange,
  metricType,
  scope
});

if (isLoading) return <RelampoLeagueLoading />;
if (!data || data.length === 0) return <RelampoLeagueEmpty />;

return <RelampoLeague data={data} onViewFull={...} />;
```

## License

Part of the Relampo platform. Internal use only.