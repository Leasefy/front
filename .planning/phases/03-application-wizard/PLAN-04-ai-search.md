# PLAN-04: AI-Powered Property Search

**Phase**: 03-application-wizard
**Focus**: Natural language search with hybrid filtering
**Estimated Scope**: ~4 files, ~500 LOC
**Depends on**: None (can be done in parallel with wizard)

---

## Goal Statement

Add an AI-style natural language search input to `/propiedades` that parses user intent and filters properties accordingly. The search works alongside traditional filters in a hybrid approach - users can type naturally OR use filters, and both methods update the same results.

---

## Success Criteria

- [ ] Large ChatGPT-style input field prominently displayed
- [ ] Natural language queries parsed into filter criteria
- [ ] Traditional filters and AI search sync bidirectionally
- [ ] Examples/suggestions shown in placeholder or chips
- [ ] Results update in real-time as user types
- [ ] Works on mobile (responsive design)

---

## Files to Create/Modify

### New Files

```
src/components/property/AISearchInput.tsx    # The main search component
src/lib/search/parseSearchQuery.ts           # NLP parsing logic
```

### Modified Files

```
src/app/propiedades/page.tsx                 # Integrate AI search
src/lib/hooks/usePropertyFilters.ts          # Add setFromNaturalLanguage
```

---

## User Experience

### Input Design (ChatGPT-style)

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  🔍 Describe lo que buscas...                                  │
│                                                                │
│  "Apto en Medellín, 80m², relativamente nuevo, 1-2M COP"      │
│                                                                │
│                                                   [Buscar →]   │
└────────────────────────────────────────────────────────────────┘

Ejemplos: "Casa con piscina en Cali" • "Estudio económico en Bogotá" • "3 habitaciones en El Poblado"
```

### Position in Page

```
┌──────────────────────────────────────────────────────────────┐
│  Navbar                                                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Propiedades                                                  │
│  Encuentra tu próximo hogar                                   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  🔍 Describe lo que buscas...                           │ │
│  │                                                         │ │
│  │  "Apto en Medellín, 80m², 1-2M COP"                    │ │
│  │                                              [Buscar]   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Ejemplos: Casa con piscina • Estudio económico • 3 hab...   │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│  15 propiedades disponibles                                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────┐  ┌──────────────────────────────────────────┐   │
│  │ Filtros │  │  Property Grid                           │   │
│  │         │  │                                          │   │
│  └─────────┘  └──────────────────────────────────────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Natural Language Parsing

### Keywords to Parse

| Intent | Keywords (ES) | Filter Applied |
|--------|---------------|----------------|
| City | "en Medellín", "en Bogotá", "Cali", etc. | `city: "Medellin"` |
| Property Type | "apto", "apartamento", "casa", "estudio", "habitación" | `propertyType` |
| Bedrooms | "2 habitaciones", "3 hab", "2 cuartos" | `bedrooms: 2` |
| Price Range | "1-2 millones", "menos de 2M", "entre 1.5 y 3M" | `minPrice/maxPrice` |
| Area | "80m²", "100 metros", "grande", "pequeño" | `minArea/maxArea` |
| Amenities | "con piscina", "con gimnasio", "parqueadero" | `amenities[]` |

### Parsing Logic

```typescript
interface ParsedQuery {
  city: string | null;
  propertyType: PropertyType | null;
  bedrooms: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  minArea: number | null;
  maxArea: number | null;
  amenities: string[];
  rawQuery: string;
}

function parseSearchQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    city: null,
    propertyType: null,
    bedrooms: null,
    minPrice: null,
    maxPrice: null,
    minArea: null,
    maxArea: null,
    amenities: [],
    rawQuery: query,
  };

  // City detection
  const cityPatterns = {
    'bogota': /\b(bogot[aá]|bog)\b/i,
    'medellin': /\b(medell[ií]n|med)\b/i,
    'cali': /\bcali\b/i,
    'barranquilla': /\b(barranquilla|baq)\b/i,
    'cartagena': /\b(cartagena|ctg)\b/i,
  };

  // Property type detection
  const typePatterns = {
    'apartment': /\b(apto|apartamento|depto)\b/i,
    'house': /\b(casa)\b/i,
    'studio': /\b(estudio)\b/i,
    'room': /\b(habitaci[oó]n|cuarto|pieza)\b/i,
  };

  // Bedrooms detection
  const bedroomMatch = query.match(/(\d+)\s*(habitacion|hab|cuarto|alcoba)/i);
  if (bedroomMatch) {
    result.bedrooms = parseInt(bedroomMatch[1]);
  }

  // Price detection (Colombian pesos)
  const pricePatterns = [
    // "1-2 millones", "entre 1 y 2 millones"
    /entre?\s*(\d+(?:[.,]\d+)?)\s*(?:y|a|-)\s*(\d+(?:[.,]\d+)?)\s*(?:millones?|M|mill)/i,
    // "menos de 2 millones", "máximo 2M"
    /(?:menos de|max|máximo|hasta)\s*(\d+(?:[.,]\d+)?)\s*(?:millones?|M|mill)/i,
    // "más de 1 millón", "mínimo 1M"
    /(?:más de|min|mínimo|desde)\s*(\d+(?:[.,]\d+)?)\s*(?:millones?|M|mill)/i,
  ];

  // Area detection
  const areaMatch = query.match(/(\d+)\s*(?:m²|m2|metros)/i);
  if (areaMatch) {
    const area = parseInt(areaMatch[1]);
    result.minArea = Math.floor(area * 0.8); // ±20% range
    result.maxArea = Math.ceil(area * 1.2);
  }

  // Amenities detection
  const amenityPatterns = {
    'pool': /\b(piscina)\b/i,
    'gym': /\b(gimn|gym)\b/i,
    'parking': /\b(parqueadero|parking|garaje)\b/i,
    'pets': /\b(mascota|perro|gato)\b/i,
    'furnished': /\b(amoblado|amueblado)\b/i,
  };

  return result;
}
```

---

## Bidirectional Sync

### AI Search → Filters
When user types and searches:
1. Parse query
2. Update filter state with parsed values
3. Filter sidebar reflects parsed criteria
4. User can further refine with traditional filters

### Filters → AI Search
When user changes a filter:
1. Generate natural language description
2. Update search input placeholder/value
3. Example: Setting city to "Medellín" shows "Propiedades en Medellín" in input

---

## Implementation Steps

### Step 1: Create parseSearchQuery utility
Create `src/lib/search/parseSearchQuery.ts`:
- Implement all parsing patterns
- Handle edge cases (typos, abbreviations)
- Return structured ParsedQuery object
- Include confidence scores (optional)

### Step 2: Create AISearchInput component
Create `src/components/property/AISearchInput.tsx`:
- Large textarea with auto-resize
- Placeholder with example query
- Search button
- Loading state during parse
- Example chips below input
- Mobile responsive

### Step 3: Update usePropertyFilters hook
Add to `src/lib/hooks/usePropertyFilters.ts`:
- `setFromParsedQuery(query: ParsedQuery)` function
- `generateNaturalDescription()` function
- Sync mechanism

### Step 4: Integrate into propiedades page
Update `src/app/propiedades/page.tsx`:
- Add AISearchInput above listing section
- Connect to filter state
- Handle search submission

---

## UI Specifications

### AISearchInput Styling (Luxterra)

```tsx
<div className="bg-white rounded-sm border border-gray-200 p-4 shadow-sm">
  <div className="relative">
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
    <textarea
      className="w-full pl-12 pr-24 py-4 text-base resize-none border-0 focus:ring-0 placeholder:text-gray-400"
      placeholder='Describe lo que buscas... "Apto en Medellín, 80m², 1-2M COP"'
      rows={2}
    />
    <button className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-gray-900 text-white text-sm rounded-sm hover:bg-gray-800 transition-colors">
      Buscar
    </button>
  </div>

  {/* Example chips */}
  <div className="mt-3 flex flex-wrap gap-2">
    <span className="text-xs text-gray-500">Ejemplos:</span>
    <button className="text-xs text-gray-600 hover:text-gray-900 transition-colors">
      Casa con piscina en Cali
    </button>
    <span className="text-gray-300">•</span>
    <button className="text-xs text-gray-600 hover:text-gray-900 transition-colors">
      Estudio económico en Bogotá
    </button>
    <span className="text-gray-300">•</span>
    <button className="text-xs text-gray-600 hover:text-gray-900 transition-colors">
      3 habitaciones en El Poblado
    </button>
  </div>
</div>
```

### Mobile Layout

```
┌─────────────────────────────┐
│ 🔍 Describe lo que buscas   │
│                             │
│ "Apto en Medellín..."       │
│                             │
│            [Buscar]         │
└─────────────────────────────┘
  Ejemplos: Casa con piscina...
```

---

## Example Queries & Expected Results

| Query | Parsed Filters |
|-------|----------------|
| "Apto en Medellín, 80m², 1-2M" | city: Medellin, type: apartment, area: 64-96, price: 1M-2M |
| "Casa con piscina en Cali" | city: Cali, type: house, amenities: [pool] |
| "Estudio económico cerca al centro" | type: studio, maxPrice: 1.5M |
| "3 habitaciones en Bogotá" | city: Bogota, bedrooms: 3 |
| "Apartamento amoblado con parqueadero" | type: apartment, amenities: [furnished, parking] |

---

## Testing Checklist

- [ ] Search input renders in prominent position
- [ ] Typing shows character count / feedback
- [ ] Search button triggers parse
- [ ] City names correctly detected
- [ ] Property types correctly detected
- [ ] Price ranges correctly parsed
- [ ] Bedroom counts correctly extracted
- [ ] Filters update after AI search
- [ ] Traditional filters still work independently
- [ ] Example chips fill input when clicked
- [ ] Mobile layout is usable
- [ ] Empty query shows all properties

---

## Future Enhancements (Not in MVP)

- Fuzzy matching for typos ("Bogta" → "Bogotá")
- Autocomplete suggestions while typing
- Save recent searches
- Voice input support
- "Did you mean..." suggestions
- Integration with actual LLM for complex queries

---

## Notes

- Parsing is deterministic (regex-based), not actual AI
- The "AI feel" comes from natural language input, not ML
- Keep parsing fast (< 50ms) for real-time feedback
- Consider debouncing for search-as-you-type
