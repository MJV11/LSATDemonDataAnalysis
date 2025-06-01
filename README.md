# LSAT Demon Performance Analyzer

A Chrome extension built with Svelte that harvests performance data from LSAT Demon to help identify strengths and weaknesses by question type and difficulty level.

## Features

- 📊 **Performance Analytics**: Visual charts showing overall accuracy and performance trends
- 📝 **Question Type Breakdown**: Detailed analysis by LSAT question types (Logical Reasoning, Reading Comprehension, etc.)
- 🎯 **Difficulty Analysis**: Performance tracking across Easy, Medium, and Hard questions
- 💾 **Data Persistence**: Collected data is stored locally and persists across sessions
- 🔄 **Multi-page Collection**: Works across different LSAT Demon pages (practice tests, analytics, review pages)

## Installation

### Development Setup

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Build the Extension**
   ```bash
   npm run build
   ```

3. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder

### Production Build

For a production-ready extension:
```bash
npm run build
```

## Usage

1. **Navigate to LSAT Demon**: Go to [lsatdemon.com](https://www.lsatdemon.com) and log in to your account

2. **Open the Extension**: Click the LSAT Demon Analyzer icon in your Chrome toolbar

3. **Collect Data**: 
   - Navigate to pages with question data (practice tests, analytics, review pages)
   - Click "Collect Data from Current Page" in the extension popup
   - The extension will automatically extract question information

4. **View Analytics**: Once data is collected, you'll see:
   - Overall performance charts
   - Breakdown by question type
   - Performance by difficulty level

## How It Works

The extension uses multiple strategies to extract data from LSAT Demon:

### Content Script Extraction
- Analyzes DOM elements for question data
- Identifies question types, difficulty levels, and correctness
- Extracts from tables, question elements, and page content

### Page Context Injection
- Intercepts AJAX/fetch requests for real-time data
- Hooks into page variables and JavaScript frameworks
- Accesses data that content scripts cannot reach

### Data Processing
- Deduplicates questions across multiple collections
- Normalizes question types and difficulty levels
- Stores data persistently in Chrome's local storage

## Supported LSAT Question Types

The extension recognizes these question types:
- Logical Reasoning
- Reading Comprehension  
- Analytical Reasoning (Logic Games)
- Strengthen/Weaken
- Assumption
- Inference
- Main Point
- Parallel Reasoning
- Flaw
- Method of Reasoning
- Principle
- Resolve/Evaluate

## Data Structure

Each collected question includes:
```javascript
{
  questionId: "unique_identifier",
  questionType: "Logical Reasoning",
  difficulty: "Medium", // Easy, Medium, Hard
  correct: true, // true/false/null
  testName: "PrepTest 85",
  questionText: "First 200 characters...",
  source: "analytics", // analytics, practice, review
  extractedAt: "2024-01-01T12:00:00.000Z"
}
```

## Privacy & Security

- **Local Storage Only**: All data is stored locally in your browser
- **No External Servers**: No data is sent to external servers
- **LSAT Demon Only**: Extension only runs on lsatdemon.com domains
- **Read-Only Access**: Extension only reads data, doesn't modify LSAT Demon

## Development

### Project Structure
```
src/
├── App.svelte              # Main application component
├── popup.html              # Extension popup HTML
├── popup.js                # Popup entry point
├── background.js           # Service worker
├── content.js              # Content script for DOM extraction
├── injected.js             # Page context script
└── components/
    ├── DataCollector.svelte      # Data collection interface
    ├── PerformanceChart.svelte   # Charts and visualizations
    └── QuestionTypeBreakdown.svelte # Detailed analytics
```

### Available Scripts
- `npm run dev` - Development build with watch mode
- `npm run build` - Production build
- `npm run preview` - Preview built extension

### Adding New Question Types

To add support for new question types, update the `findQuestionType` function in `src/content.js`:

```javascript
const types = [
  'existing types...',
  'new question type'
];
```

## Troubleshooting

### No Data Collected
- Ensure you're on a LSAT Demon page with question data
- Try different pages (analytics, practice tests, review pages)
- Check the browser console for error messages

### Extension Not Loading
- Verify the extension is enabled in `chrome://extensions/`
- Check that you've loaded the `dist` folder, not the source folder
- Rebuild the extension with `npm run build`

### Data Not Persisting
- Check Chrome's storage permissions
- Clear extension data and try collecting again

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on LSAT Demon
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Disclaimer

This extension is not affiliated with LSAT Demon. It's designed to help students analyze their own performance data for educational purposes. 