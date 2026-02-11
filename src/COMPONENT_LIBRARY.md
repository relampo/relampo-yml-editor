# Pulse Component Library

Catálogo completo de componentes con código React.

---

## Índice

1. [Layout Components](#layout-components)
2. [Navigation](#navigation)
3. [Buttons](#buttons)
4. [Forms](#forms)
5. [Data Display](#data-display)
6. [Visualizations](#visualizations)
7. [Feedback](#feedback)

---

## Layout Components

### App Shell

**Ubicación:** `/App.tsx`

```tsx
<div className="h-screen flex flex-col bg-neutral-50">
  <TopBar {...props} />
  <div className="flex flex-1 overflow-hidden">
    <Sidebar activeNav={activeNav} onNavigate={setActiveNav} />
    <main className="flex-1 overflow-hidden">
      {renderMainContent()}
    </main>
  </div>
</div>
```

---

### Workbench Layout

**Ubicación:** `/components/Workbench.tsx`

```tsx
<div className="h-full flex flex-col bg-neutral-50">
  {/* Tabs */}
  <div className="bg-white border-b border-neutral-200">
    {/* Tabs */}
  </div>

  {/* Split View */}
  <div className="flex flex-1 overflow-hidden">
    <ScriptTree {...props} />
    <DetailPanel {...props} />
  </div>
</div>
```

**Props:**
```typescript
activeTab: 'recording' | 'scripting' | 'debugging' | ...
selectedNode: ScriptNode | null
scriptTree: ScriptNode
```

---

## Navigation

### Sidebar

**Ubicación:** `/components/Sidebar.tsx`

**Nav Item (Active):**
```tsx
<button className="w-full flex items-center gap-3 px-3 py-2 
                   rounded-lg bg-blue-50 text-blue-700 
                   shadow-sm">
  <Icon className="w-4 h-4" />
  <span className="text-sm">Dashboard</span>
</button>
```

**Nav Item (Inactive):**
```tsx
<button className="w-full flex items-center gap-3 px-3 py-2 
                   rounded-lg text-neutral-700 
                   hover:bg-neutral-100">
  <Icon className="w-4 h-4" />
  <span className="text-sm">Projects</span>
</button>
```

**Props:**
```typescript
interface SidebarProps {
  activeNav: NavigationItem;
  onNavigate: (nav: NavigationItem) => void;
}
```

---

### TopBar

**Ubicación:** `/components/TopBar.tsx`

**Project Selector:**
```tsx
<button className="flex items-center gap-2 px-3 py-1.5 
                   rounded-lg hover:bg-neutral-100 
                   transition-colors">
  <span className="text-sm text-neutral-900 font-medium">
    {selectedProject}
  </span>
  <ChevronDown className="w-4 h-4 text-neutral-500" />
</button>
```

**Environment Selector:**
```tsx
<button className="flex items-center gap-2 px-3 py-1.5 
                   rounded-lg bg-neutral-100 
                   hover:bg-neutral-200">
  <div className="w-2 h-2 rounded-full bg-green-500 
                  shadow-sm" />
  <span className="text-sm text-neutral-900 capitalize">
    staging
  </span>
  <ChevronDown className="w-4 h-4 text-neutral-500" />
</button>
```

**User Avatar:**
```tsx
<div className="w-7 h-7 bg-gradient-to-br 
                from-blue-600 to-blue-800 rounded-full 
                flex items-center justify-center shadow-md">
  <User className="w-4 h-4 text-white" />
</div>
```

---

### Tabs (Workbench)

**Active Tab:**
```tsx
<button className="px-4 py-3 text-sm relative text-blue-700">
  Scripting
  <div className="absolute bottom-0 left-0 right-0 
                  h-0.5 bg-blue-600" />
</button>
```

**Inactive Tab:**
```tsx
<button className="px-4 py-3 text-sm text-neutral-600 
                   hover:text-neutral-900">
  Recording
</button>
```

---

## Buttons

### Primary
```tsx
<button className="px-4 py-2 bg-blue-600 
                   hover:bg-blue-700 text-white 
                   rounded-lg transition-colors 
                   shadow-sm hover:shadow-md">
  Save Changes
</button>
```

### Success
```tsx
<button className="flex items-center gap-2 px-4 py-2 
                   bg-green-600 hover:bg-green-700 
                   text-white rounded-lg transition-colors">
  <Play className="w-4 h-4" />
  Start
</button>
```

### Destructive
```tsx
<button className="flex items-center gap-2 px-4 py-2 
                   bg-red-600 hover:bg-red-700 
                   text-white rounded-lg transition-colors">
  <Square className="w-4 h-4" />
  Stop
</button>
```

### Special
```tsx
<button className="px-4 py-2 bg-purple-600 
                   hover:bg-purple-700 text-white 
                   rounded-lg transition-colors">
  Clear
</button>
```

### Disabled
```tsx
<button disabled className="px-4 py-2 bg-neutral-200 
                             text-neutral-500 rounded-lg 
                             cursor-not-allowed">
  Start
</button>
```

### Icon Button
```tsx
<button className="p-2 hover:bg-neutral-100 rounded-lg 
                   transition-colors group">
  <Bell className="w-4 h-4 text-neutral-600 
                   group-hover:text-neutral-900" />
</button>
```

---

## Forms

### Text Input

**Standard:**
```tsx
<input
  type="text"
  className="w-full px-3 py-2 border border-neutral-300 
             rounded-lg bg-white text-neutral-900
             focus:outline-none focus:ring-2 
             focus:ring-blue-500 focus:border-transparent 
             transition-all"
  placeholder="Enter value..."
/>
```

**Small (Toolbar):**
```tsx
<input
  type="text"
  className="w-20 px-2 py-1 border border-neutral-300 
             rounded text-sm focus:outline-none 
             focus:ring-2 focus:ring-blue-500"
  value="8888"
/>
```

**With Label:**
```tsx
<div>
  <label className="block text-xs text-neutral-600 mb-1">
    Port
  </label>
  <input
    type="text"
    className="w-20 px-2 py-1 border border-neutral-300 
               rounded text-sm"
  />
</div>
```

---

### Textarea

```tsx
<textarea
  className="w-full h-32 px-3 py-2 border 
             border-neutral-300 rounded-lg bg-white 
             text-neutral-900 resize-none
             focus:outline-none focus:ring-2 
             focus:ring-blue-500"
  placeholder="Enter text..."
/>
```

**Code/JSON:**
```tsx
<textarea
  className="w-full h-64 px-3 py-2 border 
             border-neutral-300 rounded-lg font-mono 
             text-sm bg-white resize-none
             focus:outline-none focus:ring-2 
             focus:ring-blue-500"
/>
```

---

### Checkbox

```tsx
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="timers"
    className="w-4 h-4"
  />
  <label htmlFor="timers" className="text-sm text-neutral-700">
    Include Timers
  </label>
</div>
```

---

## Data Display

### Script Tree

**Ubicación:** `/components/ScriptTree.tsx`

**Node (Selected):**
```tsx
<div className="flex items-center gap-2 px-3 py-1.5 
                cursor-pointer rounded-md bg-blue-50 
                text-blue-700"
     style={{ paddingLeft: `${depth * 16 + 12}px` }}>
  <button className="p-0.5 hover:bg-neutral-200 rounded">
    <ChevronDown className="w-3 h-3" />
  </button>
  <Icon className="w-4 h-4 text-blue-600" />
  <span className="text-sm flex-1 truncate">
    HTTP Request - Login
  </span>
</div>
```

**Node (Unselected):**
```tsx
<div className="flex items-center gap-2 px-3 py-1.5 
                cursor-pointer rounded-md hover:bg-neutral-100 
                text-neutral-700"
     style={{ paddingLeft: `${depth * 16 + 12}px` }}>
  <button className="p-0.5 hover:bg-neutral-200 rounded">
    <ChevronRight className="w-3 h-3" />
  </button>
  <Icon className="w-4 h-4 text-purple-600" />
  <span className="text-sm flex-1 truncate">
    Scenario - User Journey
  </span>
</div>
```

**Icon Colors:**
```typescript
'test-plan': 'text-blue-600'
'scenario': 'text-purple-600'
'http-request': 'text-blue-500'
'cookie-manager': 'text-pink-600'
'timer': 'text-cyan-600'
'assertion': 'text-green-500'
```

---

### Cards

**Standard:**
```tsx
<div className="bg-white border border-neutral-200 
                rounded-lg p-4 shadow-sm">
  <h3 className="text-neutral-900 mb-4">Card Title</h3>
  <p className="text-neutral-600">Content</p>
</div>
```

**Stat Card:**
```tsx
<div className="bg-white border border-neutral-200 
                rounded-lg p-4 shadow-sm 
                hover:shadow-md transition-shadow">
  <div className="flex items-center justify-between mb-3">
    <span className="text-sm text-neutral-600">
      Active Tests
    </span>
    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
      <Activity className="w-4 h-4" />
    </div>
  </div>
  <p className="text-neutral-900 font-semibold">3</p>
</div>
```

**Metric Card:**
```tsx
<div className="bg-white border border-neutral-200 
                rounded-lg p-3">
  <div className="flex items-center gap-2 mb-1">
    <Activity className="w-4 h-4 text-blue-600" />
    <span className="text-xs text-neutral-600">Requests</span>
  </div>
  <p className="text-neutral-900">1,248</p>
</div>
```

---

### Badges

**HTTP Method:**
```tsx
{/* GET */}
<div className="px-2 py-0.5 rounded text-xs 
                bg-blue-100 text-blue-700">
  GET
</div>

{/* POST */}
<div className="px-2 py-0.5 rounded text-xs 
                bg-green-100 text-green-700">
  POST
</div>
```

**Status (Pill):**
```tsx
{/* Success */}
<span className="px-3 py-1 rounded-full text-xs 
                 bg-green-100 text-green-700">
  passed
</span>

{/* Running */}
<span className="px-3 py-1 rounded-full text-xs 
                 bg-blue-100 text-blue-700">
  running
</span>

{/* Failed */}
<span className="px-3 py-1 rounded-full text-xs 
                 bg-red-100 text-red-700">
  failed
</span>
```

**Status Dot:**
```tsx
{/* Success */}
<div className="w-2 h-2 rounded-full bg-green-500" />

{/* Running/Live */}
<div className="w-2 h-2 rounded-full bg-blue-500 
                animate-pulse" />

{/* Recording */}
<div className="w-2 h-2 rounded-full bg-red-600 
                animate-pulse" />

{/* Failed */}
<div className="w-2 h-2 rounded-full bg-red-500" />
```

---

### Lists

**Test Run List:**
```tsx
<div className="bg-white border border-neutral-200 
                rounded-lg shadow-sm">
  <div className="px-6 py-4 border-b border-neutral-200">
    <h3 className="text-neutral-900">Recent Test Runs</h3>
  </div>
  <div className="divide-y divide-neutral-200">
    <div className="px-6 py-4 flex items-center 
                    justify-between hover:bg-neutral-50 
                    cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <div>
          <p className="text-sm text-neutral-900">
            E-Commerce Load Test
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            Today, 14:23
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-sm text-neutral-600">
          15m 23s
        </span>
        <span className="px-3 py-1 rounded-full text-xs 
                         bg-green-100 text-green-700">
          passed
        </span>
      </div>
    </div>
  </div>
</div>
```

**Request List:**
```tsx
<div className="flex items-center gap-3 px-4 py-2 
                border-b border-neutral-200 cursor-pointer 
                hover:bg-neutral-50 bg-blue-50">
  <Play className="w-3 h-3 text-neutral-400" />
  <div className="px-2 py-0.5 rounded text-xs 
                  bg-blue-100 text-blue-700">
    GET
  </div>
  <span className="flex-1 text-xs text-neutral-900 
                   truncate font-mono">
    https://api.example.com/users
  </span>
  <span className="px-2 py-0.5 rounded text-xs 
                   bg-green-100 text-green-700">
    200
  </span>
</div>
```

---

### Headers

**Page Header:**
```tsx
<div>
  <h1 className="text-neutral-900">Dashboard</h1>
  <p className="text-neutral-600 mt-1">
    Performance testing overview
  </p>
</div>
```

**Section Header:**
```tsx
<div className="px-6 py-4 border-b border-neutral-200">
  <h3 className="text-neutral-900">Section Title</h3>
</div>
```

**Panel Header with Action:**
```tsx
<div className="px-6 py-4 border-b border-neutral-200">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-neutral-900">
        Performance Monitoring
      </h3>
      <p className="text-sm text-neutral-600 mt-1">
        Real-time metrics
      </p>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-green-500 rounded-full 
                      animate-pulse" />
      <span className="text-sm text-neutral-700">Live</span>
    </div>
  </div>
</div>
```

---

### Code Display

**Response Viewer:**
```tsx
<pre className="bg-neutral-900 text-neutral-100 p-4 
                rounded-lg text-xs overflow-x-auto">
  {JSON.stringify(data, null, 2)}
</pre>
```

**Log Console:**
```tsx
<div className="h-32 bg-neutral-900 flex flex-col">
  <div className="px-4 py-2 border-b border-neutral-700">
    <h4 className="text-xs text-neutral-300">Log Console</h4>
  </div>
  <div className="flex-1 overflow-y-auto p-3 font-mono 
                  text-xs text-neutral-100">
    <div className="space-y-1">
      <div className="text-green-400">
        [14:23:12.456] Proxy started
      </div>
      <div className="text-blue-400">
        [14:23:12.601] Captured: GET /api/users
      </div>
      <div className="text-amber-400">
        [14:23:15.123] Warning: Slow response
      </div>
      <div className="text-red-400">
        [14:23:18.456] Error: Connection timeout
      </div>
    </div>
  </div>
</div>
```

---

### Data Tables

**Key-Value:**
```tsx
<div className="border border-neutral-200 rounded-lg 
                overflow-hidden">
  <div className="flex border-b border-neutral-200">
    <div className="w-1/3 px-3 py-2 bg-neutral-50 text-sm 
                    text-neutral-700 border-r 
                    border-neutral-200">
      Content-Type
    </div>
    <div className="flex-1 px-3 py-2 text-sm 
                    text-neutral-900 font-mono">
      application/json
    </div>
  </div>
</div>
```

---

## Visualizations

### Chart Container

```tsx
<div className="bg-white border border-neutral-200 
                rounded-lg p-4">
  <h4 className="text-sm text-neutral-900 mb-4">
    Chart Title
  </h4>
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      {/* Chart */}
    </ResponsiveContainer>
  </div>
</div>
```

---

### Line Chart

**Ubicación:** `/components/details/MonitoringView.tsx`

```tsx
<ResponsiveContainer width="100%" height="100%">
  <LineChart data={responseTimeData}>
    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
    <XAxis 
      dataKey="time" 
      tick={{ fontSize: 12 }}
      stroke="#9ca3af"
    />
    <YAxis 
      tick={{ fontSize: 12 }}
      stroke="#9ca3af"
    />
    <Tooltip 
      contentStyle={{ 
        backgroundColor: 'white', 
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '12px'
      }}
    />
    <Legend wrapperStyle={{ fontSize: '12px' }} />
    <Line 
      type="monotone" 
      dataKey="responseTime" 
      stroke="#3b82f6" 
      strokeWidth={2}
      name="Response Time (ms)"
      dot={{ r: 3 }}
    />
    <Line 
      type="monotone" 
      dataKey="concurrency" 
      stroke="#10b981" 
      strokeWidth={2}
      name="Concurrency"
      dot={{ r: 3 }}
    />
  </LineChart>
</ResponsiveContainer>
```

**Line Colors:**
- Primary: `#3b82f6` (Blue)
- Secondary: `#10b981` (Green)
- Error: `#ef4444` (Red)
- Special: `#8b5cf6` (Purple)

---

### Area Chart

```tsx
<ResponsiveContainer width="100%" height="100%">
  <AreaChart data={cpuMemoryData}>
    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
    <YAxis tick={{ fontSize: 11 }} />
    <Tooltip contentStyle={{...}} />
    <Area 
      type="monotone" 
      dataKey="cpu" 
      stroke="#3b82f6" 
      fill="#3b82f6" 
      fillOpacity={0.2}
      name="CPU %"
    />
  </AreaChart>
</ResponsiveContainer>
```

---

## Feedback

### Live Indicator

```tsx
<div className="flex items-center gap-2">
  <div className="w-2 h-2 bg-green-500 rounded-full 
                  animate-pulse" />
  <span className="text-sm text-neutral-700">Live</span>
</div>
```

**Variantes:**
- Live: `bg-green-500`
- Recording: `bg-red-600`
- Processing: `bg-blue-500`

---

### Recording Banner

```tsx
<div className="px-6 py-3 bg-red-50 border-b 
                border-red-200">
  <div className="flex items-center gap-3">
    <div className="w-2 h-2 bg-red-600 rounded-full 
                    animate-pulse" />
    <span className="text-sm text-red-900">
      Recording - Idle
    </span>
  </div>
</div>
```

---

### Empty State

```tsx
<div className="flex items-center justify-center h-full">
  <div className="text-center max-w-md">
    <h2 className="mb-4">No Data Available</h2>
    <p className="text-neutral-600">
      Select a node from the tree to view details.
    </p>
  </div>
</div>
```

---

## Utility

### Separators

**Vertical:**
```tsx
<div className="h-6 w-px bg-neutral-300 mx-2" />
```

**Horizontal:**
```tsx
<div className="border-b border-neutral-200" />
```

---

### Grid Layouts

**Dashboard Stats (4 cols):**
```tsx
<div className="grid grid-cols-4 gap-4">
  {/* Cards */}
</div>
```

**Monitoring Metrics (6 cols):**
```tsx
<div className="grid grid-cols-6 gap-4">
  {/* Metric cards */}
</div>
```

**Charts (2 cols):**
```tsx
<div className="grid grid-cols-2 gap-6">
  {/* Charts */}
</div>
```

---

### Avatar

**User:**
```tsx
<div className="w-7 h-7 bg-gradient-to-br 
                from-blue-600 to-blue-800 rounded-full 
                flex items-center justify-center shadow-md">
  <User className="w-4 h-4 text-white" />
</div>
```

**Logo:**
```tsx
<div className="w-8 h-8 bg-gradient-to-br 
                from-blue-600 to-blue-800 rounded-lg 
                flex items-center justify-center shadow-md">
  <span className="text-white text-sm font-semibold">⚡</span>
</div>
```

---

## Composition Examples

### Dashboard Layout

```tsx
<div className="h-full overflow-y-auto bg-neutral-50 p-6">
  <div className="max-w-7xl mx-auto space-y-6">
    {/* Page Header */}
    <div>
      <h1 className="text-neutral-900">Dashboard</h1>
      <p className="text-neutral-600 mt-1">Overview</p>
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-4 gap-4">
      {stats.map(stat => <StatCard {...stat} />)}
    </div>

    {/* Recent Tests */}
    <div className="bg-white border border-neutral-200 
                    rounded-lg">
      {/* List */}
    </div>
  </div>
</div>
```

---

### Split View (Workbench)

```tsx
<div className="flex flex-1 overflow-hidden">
  {/* Left: Tree */}
  <div className="w-80 bg-white border-r 
                  border-neutral-200 flex flex-col">
    <div className="px-4 py-3 border-b border-neutral-200">
      <h3 className="text-sm text-neutral-900">Script Tree</h3>
    </div>
    <div className="flex-1 overflow-y-auto p-2">
      {/* Nodes */}
    </div>
  </div>

  {/* Right: Details */}
  <div className="flex-1 flex flex-col bg-white">
    <div className="px-6 py-4 border-b border-neutral-200">
      <h3 className="text-neutral-900">Details</h3>
    </div>
    <div className="flex-1 overflow-y-auto p-6">
      {/* Content */}
    </div>
  </div>
</div>
```

---

### Toolbar with Actions

```tsx
<div className="px-6 py-4 border-b border-neutral-200 
                bg-white">
  <div className="flex items-center gap-3">
    {/* Buttons */}
    <button className="flex items-center gap-2 px-4 py-2 
                       bg-green-600 hover:bg-green-700 
                       text-white rounded-lg">
      <Play className="w-4 h-4" />
      Start
    </button>

    {/* Separator */}
    <div className="h-6 w-px bg-neutral-300 mx-2" />

    {/* Settings */}
    <div className="flex items-center gap-2">
      <label className="text-sm text-neutral-700">Port:</label>
      <input type="text" 
             className="w-20 px-2 py-1 border 
                        border-neutral-300 rounded text-sm" />
    </div>
  </div>
</div>
```

---

## File Map

```
/App.tsx                    → App Shell
/components/
  Sidebar.tsx               → Navigation
  TopBar.tsx                → Header
  Workbench.tsx             → Workbench layout
  ScriptTree.tsx            → Tree
  DetailPanel.tsx           → Detail router
  Dashboard.tsx             → Dashboard view
  Projects.tsx              → Projects view
  Settings.tsx              → Settings view
  /details/
    HttpRequestDetail.tsx   → HTTP detail
    RecordingView.tsx       → Recording
    MonitoringView.tsx      → Monitoring
    DebuggingView.tsx       → Debugging
    GenerationView.tsx      → Generation
    ... (más)
```

---

## Usage Guidelines

**Buttons:**
- Primary: Una acción principal por contexto
- Success: Iniciar procesos (Start, Run)
- Destructive: Detener/eliminar (Stop, Delete)

**Cards:**
- Stat: Métricas numéricas en Dashboard
- Metric: Métricas compactas en Monitoring
- Standard: Contenido agrupado

**Badges:**
- Method: HTTP methods (GET, POST)
- Status: Estados de procesos (passed, failed)
- Code: HTTP status codes (200, 404)

**Charts:**
- Line: Tendencias en tiempo real
- Area: Utilización de recursos

---

**Versión:** 1.0.0  
**Componentes:** 60+ variantes  
**Fecha:** Enero 2026
