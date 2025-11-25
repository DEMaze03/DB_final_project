# Hearthstone Card Interaction Tool

A web-based tool for searching and analyzing Hearthstone card interactions.

## Features

- **Card Search**: Search cards with fuzzy matching by name
- **Advanced Filters**: Filter by type, class, rarity, and mana cost
- **Drag & Drop**: Intuitive drag-and-drop interface for card comparison
- **Interaction Analysis**: Compare two cards to analyze their interactions

## Prerequisites

- Node.js (v18 or higher)
- npm

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hs-card-tool
```

2. Install dependencies:
```bash
npm install
```

## Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173/`

## Building for Production

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
hs-card-tool/
├── index.html          # Main HTML file
├── script.js           # JavaScript logic
├── styles.css          # Styling
├── package.json        # Project dependencies
├── package-lock.json   # Dependency lock file
├── vite.config.js      # Vite configuration
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Integration TODO

The frontend is ready for backend integration. Add your Neo4j queries in these functions:

- `executeSearch()` - Connect to Neo4j and query cards based on filters
- `handleDrop()` - Fetch card details by ID from database
- `analyzeInteraction()` - Implement card interaction logic

## Technologies Used

- **Vite**: Fast build tool and dev server
- **Vanilla JavaScript**: No framework dependencies
- **CSS Grid & Flexbox**: Responsive layout
- **HTML5 Drag and Drop API**: Card selection interface

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

MIT