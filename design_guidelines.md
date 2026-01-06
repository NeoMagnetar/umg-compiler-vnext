# UMG Design Guidelines

## Design Approach
**System Selected**: Linear/Vercel hybrid approach - modern developer tool aesthetic emphasizing clarity, speed, and precision. Clean, functional interface with subtle sophistication.

## Typography System
- **Primary Font**: Inter (Google Fonts)
- **Code Font**: JetBrains Mono
- **Hierarchy**:
  - Display: text-4xl to text-6xl, font-semibold
  - Headings: text-2xl to text-3xl, font-semibold
  - Body: text-base, font-normal
  - UI Labels: text-sm, font-medium
  - Code/Technical: text-sm, font-mono

## Spacing System
**Tailwind units**: 2, 4, 6, 8, 12, 16, 24
- Component padding: p-4, p-6
- Section spacing: py-12, py-16, py-24
- Grid gaps: gap-4, gap-6, gap-8

## Layout Architecture

### Marketing/Landing Page
**Hero Section** (h-screen):
- Large hero image: Abstract visualization of code compilation/building process (isometric 3D blocks, flowing data streams, node graphs)
- Split layout: 60% content left, 40% terminal/code preview right
- Headline: text-5xl, max-w-2xl
- Subheadline: text-xl, max-w-xl
- CTA group: Primary + Secondary buttons (px-6 py-3), buttons on hero image use backdrop-blur-lg bg-white/10

**Features Grid** (3 columns on desktop, 1 on mobile):
- Icon + Title + Description cards
- Use Heroicons for consistent iconography
- Hover elevation: subtle shadow lift

**Interactive Demo Section**:
- Split view: Code editor mockup left, live preview right
- Terminal-style interface showing compilation process
- Syntax highlighted code blocks

**Documentation Preview**:
- 2-column layout: Navigation sidebar + content preview
- Show sample API documentation

**Footer**:
- 4-column grid: Product, Developers, Company, Resources
- Newsletter signup with inline form
- GitHub stars counter, Discord community link

### Builder Web Application

**App Shell Layout**:
- Top bar (h-14): Logo, project selector, user menu
- Left sidebar (w-64): Collapsible navigation, file tree structure
- Main canvas: Responsive builder workspace
- Right panel (w-80): Properties inspector, component settings
- Bottom panel (h-48): Console/terminal output (toggleable)

**Component Library Panel**:
- Searchable component list with icons
- Categorized sections (Layout, Forms, Data, etc.)
- Drag-and-drop preview cards

**Properties Inspector**:
- Accordion-style sections
- Form inputs with inline validation
- Toggle switches, sliders, color inputs
- Real-time preview updates

**Code Editor Interface**:
- Split view: Visual + Code toggle
- Line numbers, syntax highlighting
- Minimap navigation (right gutter)
- Breadcrumb navigation above editor

## Core Components

**Navigation**:
- Horizontal top nav with icon + text
- Vertical sidebar with nested items
- Breadcrumb trail for context

**Cards**:
- Subtle borders, minimal shadows
- Hover states: border accent
- Padding: p-6

**Buttons**:
- Primary: Solid fill, rounded-md
- Secondary: Border outline
- Sizes: sm (px-4 py-2), md (px-6 py-3), lg (px-8 py-4)

**Forms**:
- Full-width inputs with labels above
- Focus states: ring-2
- Validation messages inline below inputs

**Data Tables**:
- Striped rows for readability
- Sortable columns with arrow indicators
- Row hover highlighting
- Pagination at bottom

**Modals/Dialogs**:
- Centered overlay with backdrop blur
- Max-width: max-w-2xl
- Close button top-right
- Action buttons bottom-right

**Terminal/Console**:
- Monospace font, dark theme aesthetic
- Line prefixes for command types
- Auto-scroll to bottom
- Copy output button

## Images

**Hero Image**: 
Large background image depicting an abstract, modern visualization of a compilation/building process. Think isometric 3D elements, flowing data connections, code transforming into visual components. Style: Gradient meshes, geometric shapes, tech-forward aesthetic (similar to Vercel/Linear hero visuals). Position: Full-width background with subtle overlay gradient for text readability.

**Feature Section Images**:
- Screenshot mockups of the builder interface in use
- Code editor with syntax highlighting showing sample compilation
- Before/after comparisons of code vs. compiled output
- 3-4 product screenshots positioned in alternating left/right layouts

**Documentation Preview**:
Clean screenshot of documentation interface showing clear, well-organized API reference

## Animations
Minimal, purposeful motion only:
- Page transitions: Subtle fade
- Sidebar collapse/expand: Smooth slide
- Component drag: Visual feedback with opacity
- No scroll-triggered animations

## Icons
**Library**: Heroicons (outline for most UI, solid for emphasis)
- Navigation icons: 20px
- Feature cards: 24px
- Buttons: 16px inline with text