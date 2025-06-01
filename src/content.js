// Content script for LSAT Demon data extraction

console.log('LSAT Demon Analyzer content script loaded on:', window.location.href);

// Test if content script is working
setTimeout(() => {
  console.log('Content script is alive and running');
}, 1000);

// Listen for messages from the popup
window.addEventListener('message', (event) => {
  console.log('Content script received message:', event.data);
  
  if (event.source !== window) {
    console.log('Message source is not window, ignoring');
    return;
  }
  
  if (event.data.type === 'START_LSAT_COLLECTION') {
    console.log('Received collection start message');
    collectDataFromCurrentPage();
  }
});

// Also listen for direct chrome runtime messages
if (chrome && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received runtime message:', message);
    
    if (message.type === 'START_LSAT_COLLECTION') {
      console.log('Received runtime collection start message');
      collectDataFromCurrentPage();
    }
    
    return true;
  });
}

function collectDataFromCurrentPage() {
  console.log('Starting data collection from current page...');
  const url = window.location.href;
  let collectedData = [];
  
  // Send initial status
  chrome.runtime.sendMessage({
    type: 'LSAT_DATA_UPDATE',
    data: [],
    status: 'Analyzing page structure...',
    complete: false
  });
  
  try {
    // Check if we're on a practice test page
    if (url.includes('/practice/') || url.includes('/review/') || url.includes('/test/')) {
      console.log('Detected practice/review/test page');
      collectedData = extractFromPracticeTestPage();
    } else if (url.includes('/analytics') || url.includes('/performance')) {
      console.log('Detected analytics/performance page');
      collectedData = extractFromAnalyticsPage();
    } else {
      console.log('Unknown page type, trying generic extraction');
      collectedData = extractFromGenericPage();
    }
    
    console.log(`Extraction complete. Found ${collectedData.length} questions`);
    
    if (collectedData.length > 0) {
      chrome.runtime.sendMessage({
        type: 'LSAT_DATA_COLLECTED',
        data: collectedData,
        complete: true
      });
    } else {
      chrome.runtime.sendMessage({
        type: 'LSAT_DATA_UPDATE',
        data: [],
        status: 'No question data found on this page. Try navigating to a practice test with the question breakdown visible.',
        complete: true
      });
    }
  } catch (error) {
    console.error('Error collecting data:', error);
    chrome.runtime.sendMessage({
      type: 'LSAT_DATA_UPDATE',
      data: [],
      status: 'Error collecting data: ' + error.message,
      complete: true
    });
  }
}

function extractFromPracticeTestPage() {
  const questions = [];
  
  console.log('Looking for ResultListItem containers...');
  
  // Target the specific LSAT Demon structure: ResultListItem containers
  const questionContainers = document.querySelectorAll('.ResultListItem-root, [class*="ResultListItem"]');
  
  console.log(`Found ${questionContainers.length} ResultListItem containers`);
  
  // Send progress update
  chrome.runtime.sendMessage({
    type: 'LSAT_DATA_UPDATE',
    data: [],
    status: `Found ${questionContainers.length} question containers`,
    complete: false
  });
  
  questionContainers.forEach((container, index) => {
    try {
      const questionData = extractQuestionFromContainer(container);
      if (questionData) {
        questions.push({
          ...questionData,
          source: 'practice',
          extractedAt: new Date().toISOString()
        });
        console.log(`Extracted question ${questionData.questionNumber}:`, questionData);
      }
    } catch (error) {
      console.warn('Error extracting from container:', error);
    }
  });
  
  // If no ResultListItem containers found, try alternative selectors
  if (questions.length === 0) {
    console.log('No ResultListItem found, trying MuiBox containers...');
    
    // Send progress update
    chrome.runtime.sendMessage({
      type: 'LSAT_DATA_UPDATE',
      data: [],
      status: 'No ResultListItem found, trying alternative selectors...',
      complete: false
    });
    
    // Look for MuiBox containers that might contain question data
    const muiBoxes = document.querySelectorAll('[class*="MuiBox-root"]');
    console.log(`Found ${muiBoxes.length} MuiBox containers`);
    
    muiBoxes.forEach((box, index) => {
      try {
        const questionData = extractQuestionFromMuiBox(box);
        if (questionData) {
          questions.push({
            ...questionData,
            source: 'practice_muibox',
            extractedAt: new Date().toISOString()
          });
          console.log(`Extracted from MuiBox - question ${questionData.questionNumber}:`, questionData);
        }
      } catch (error) {
        console.warn('Error extracting from MuiBox:', error);
      }
    });
  }
  
  // If still no questions, try the numbered button approach
  if (questions.length === 0) {
    console.log('Trying numbered button approach...');
    
    // Send progress update
    chrome.runtime.sendMessage({
      type: 'LSAT_DATA_UPDATE',
      data: [],
      status: 'Trying numbered button extraction...',
      complete: false
    });
    
    questions.push(...extractFromNumberedButtons());
  }
  
  return questions;
}

function extractQuestionFromContainer(container) {
  console.log('Analyzing container:', container.className);
  
  // Find the question number button
  const numberButton = container.querySelector('button[aria-pressed], button[tabindex], button');
  if (!numberButton) {
    console.log('No button found in container');
    return null;
  }
  
  const questionNumber = parseInt(numberButton.textContent.trim());
  if (isNaN(questionNumber)) {
    console.log('Button text is not a number:', numberButton.textContent);
    return null;
  }
  
  console.log(`Found question number: ${questionNumber}`);
  
  // Find the question type text
  const questionTypeElement = container.querySelector('[class*="MuiTypography"]');
  const questionType = questionTypeElement ? questionTypeElement.textContent.trim() : null;
  
  console.log(`Question type: ${questionType}`);
  
  // Check correctness from aria-pressed attribute
  const ariaPressedValue = numberButton.getAttribute('aria-pressed');
  const isCorrect = ariaPressedValue === 'true';
  
  console.log(`Correctness - aria-pressed: ${ariaPressedValue}, isCorrect: ${isCorrect}`);
  
  // Find difficulty from the bar chart indicators
  const difficulty = extractDifficultyFromContainer(container);
  
  console.log(`Difficulty: ${difficulty}`);
  
  // Get test information
  const testName = findTestNameFromPage();
  
  const questionData = {
    questionId: `${testName}_q${questionNumber}_${Date.now()}`,
    questionNumber: questionNumber,
    questionType: questionType || 'Unknown',
    difficulty: difficulty || 'Unknown',
    correct: ariaPressedValue !== null ? isCorrect : null,
    testName: testName,
    questionText: container.textContent.substring(0, 200),
    rawData: {
      ariaPressedValue: ariaPressedValue,
      containerClasses: container.className,
      questionTypeText: questionType
    }
  };
  
  console.log(`Final question data:`, questionData);
  
  return questionData;
}

function extractQuestionFromMuiBox(box) {
  // Look for numbered buttons within this box
  const numberButton = box.querySelector('button');
  if (!numberButton) return null;
  
  const buttonText = numberButton.textContent.trim();
  const questionNumber = parseInt(buttonText);
  if (isNaN(questionNumber) || questionNumber < 1 || questionNumber > 30) return null;
  
  console.log(`MuiBox - Found question number: ${questionNumber}`);
  
  // Look for question type in nearby text
  const allText = box.textContent;
  const questionType = findQuestionTypeInText(allText);
  
  // Check aria-pressed for correctness
  const ariaPressedValue = numberButton.getAttribute('aria-pressed');
  const isCorrect = ariaPressedValue === 'true';
  
  // Try to find difficulty indicators
  const difficulty = extractDifficultyFromContainer(box);
  
  const testName = findTestNameFromPage();
  
  if (questionType || ariaPressedValue !== null) {
    const questionData = {
      questionId: `${testName}_q${questionNumber}_${Date.now()}`,
      questionNumber: questionNumber,
      questionType: questionType || 'Unknown',
      difficulty: difficulty || 'Unknown',
      correct: ariaPressedValue !== null ? isCorrect : null,
      testName: testName,
      questionText: allText.substring(0, 200),
      rawData: {
        ariaPressedValue,
        containerClasses: box.className,
        allText: allText.substring(0, 100)
      }
    };
    
    console.log(`MuiBox question data:`, questionData);
    return questionData;
  }
  
  return null;
}

function extractFromNumberedButtons() {
  const questions = [];
  
  console.log('Looking for numbered buttons...');
  
  // Find all numbered buttons
  const buttons = document.querySelectorAll('button');
  console.log(`Found ${buttons.length} total buttons`);
  
  buttons.forEach(button => {
    const buttonText = button.textContent.trim();
    const questionNumber = parseInt(buttonText);
    
    if (!isNaN(questionNumber) && questionNumber >= 1 && questionNumber <= 30) {
      console.log(`Found numbered button: ${questionNumber}`);
      
      // This looks like a question number button
      const ariaPressedValue = button.getAttribute('aria-pressed');
      const isCorrect = ariaPressedValue === 'true';
      
      // Look for question type in the parent container
      const container = button.closest('[class*="MuiBox"], [class*="ResultList"], div');
      const questionType = container ? findQuestionTypeInText(container.textContent) : null;
      
      // Look for difficulty indicators
      const difficulty = container ? extractDifficultyFromContainer(container) : null;
      
      const testName = findTestNameFromPage();
      
      const questionData = {
        questionId: `${testName}_q${questionNumber}_${Date.now()}`,
        questionNumber: questionNumber,
        questionType: questionType || 'Unknown',
        difficulty: difficulty || 'Unknown',
        correct: ariaPressedValue !== null ? isCorrect : null,
        testName: testName,
        questionText: container ? container.textContent.substring(0, 200) : buttonText,
        rawData: {
          ariaPressedValue,
          buttonText,
          containerText: container ? container.textContent.substring(0, 100) : ''
        }
      };
      
      console.log(`Button question data:`, questionData);
      questions.push(questionData);
    }
  });
  
  return questions;
}

function extractDifficultyFromContainer(container) {
  // Look for difficulty indicators in the bar charts
  // These might be represented as filled/unfilled segments
  
  // Look for elements that might represent difficulty bars
  const difficultyElements = container.querySelectorAll(
    '[class*="difficulty"], [class*="bar"], [class*="segment"], [class*="indicator"]'
  );
  
  if (difficultyElements.length > 0) {
    // Count filled vs total segments
    const filledSegments = Array.from(difficultyElements).filter(el => {
      const style = window.getComputedStyle(el);
      const bgColor = style.backgroundColor;
      const opacity = style.opacity;
      
      // Check if the segment appears "filled" (not transparent/gray)
      return opacity !== '0' && !bgColor.includes('transparent') && !bgColor.includes('rgba(0, 0, 0, 0)');
    });
    
    const fillRatio = filledSegments.length / difficultyElements.length;
    
    if (fillRatio <= 0.33) return 'Easy';
    if (fillRatio <= 0.66) return 'Medium';
    return 'Hard';
  }
  
  // Look for text-based difficulty indicators
  const containerText = container.textContent.toLowerCase();
  if (containerText.includes('easy')) return 'Easy';
  if (containerText.includes('medium')) return 'Medium';
  if (containerText.includes('hard') || containerText.includes('difficult')) return 'Hard';
  
  return null;
}

function findQuestionTypeInText(text) {
  const lowerText = text.toLowerCase();
  
  const types = [
    'main point',
    'strengthen',
    'weaken', 
    'assumption',
    'inference',
    'flaw',
    'method of reasoning',
    'method',
    'principle',
    'parallel reasoning',
    'parallel',
    'stated',
    'meaning',
    'supported',
    'resolve',
    'evaluate',
    'organization',
    'analogy',
    'logical reasoning',
    'reading comprehension',
    'analytical reasoning',
    'logic games'
  ];
  
  for (const type of types) {
    if (lowerText.includes(type)) {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }
  
  return null;
}

function extractFromAnalyticsPage() {
  const questions = [];
  
  // Look for common analytics table structures
  const tableRows = document.querySelectorAll('tr, .question-row, .analytics-row');
  
  console.log(`Analytics page - found ${tableRows.length} table rows`);
  
  tableRows.forEach((row, index) => {
    try {
      const questionData = extractQuestionFromRow(row);
      if (questionData) {
        questions.push({
          ...questionData,
          source: 'analytics',
          extractedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn('Error extracting from row:', error);
    }
  });
  
  return questions;
}

function extractFromGenericPage() {
  // Try all extraction methods
  return [
    ...extractFromPracticeTestPage(),
    ...extractFromAnalyticsPage()
  ];
}

function extractQuestionFromRow(row) {
  const cells = row.querySelectorAll('td, th, .cell, .column');
  if (cells.length === 0) return null;
  
  const textContent = Array.from(cells).map(cell => cell.textContent.trim());
  
  const questionType = findQuestionType(textContent);
  const difficulty = findDifficulty(textContent);
  const correct = findCorrectness(textContent);
  const testName = findTestName(textContent);
  
  if (questionType || difficulty !== null || correct !== null) {
    return {
      questionId: generateQuestionId(row),
      questionType,
      difficulty,
      correct,
      testName,
      questionText: textContent.join(' ').substring(0, 200),
      rawData: textContent
    };
  }
  
  return null;
}

function findQuestionType(textArray) {
  const text = textArray.join(' ').toLowerCase();
  
  const types = [
    'logical reasoning',
    'reading comprehension',
    'analytical reasoning',
    'logic games',
    'strengthen',
    'weaken',
    'assumption',
    'inference',
    'main point',
    'parallel reasoning',
    'flaw',
    'method of reasoning',
    'principle',
    'resolve',
    'evaluate',
    'stated',
    'meaning',
    'supported'
  ];
  
  for (const type of types) {
    if (text.includes(type)) {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }
  
  return null;
}

function findDifficulty(textArray) {
  const text = textArray.join(' ').toLowerCase();
  
  if (text.includes('easy') || text.includes('1 star') || text.includes('★')) return 'Easy';
  if (text.includes('medium') || text.includes('2 star') || text.includes('★★')) return 'Medium';
  if (text.includes('hard') || text.includes('difficult') || text.includes('3 star') || text.includes('★★★')) return 'Hard';
  
  const difficultyMatch = text.match(/difficulty[:\s]*(\d+)/i);
  if (difficultyMatch) {
    const level = parseInt(difficultyMatch[1]);
    if (level <= 2) return 'Easy';
    if (level <= 4) return 'Medium';
    return 'Hard';
  }
  
  return null;
}

function findCorrectness(textArray) {
  const text = textArray.join(' ').toLowerCase();
  
  if (text.includes('correct') || text.includes('✓') || text.includes('right')) return true;
  if (text.includes('incorrect') || text.includes('✗') || text.includes('wrong')) return false;
  
  return null;
}

function findTestName(textArray) {
  const text = textArray.join(' ');
  
  const testMatch = text.match(/(?:test|pt|preptest)\s*(\d+)/i);
  if (testMatch) {
    return `PrepTest ${testMatch[1]}`;
  }
  
  return findTestNameFromPage();
}

function findTestNameFromPage() {
  const title = document.title;
  const headers = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent);
  const url = window.location.href;
  
  // Extract from URL
  const urlMatch = url.match(/test[\/\-_]?(\d+)/i);
  if (urlMatch) {
    return `Test ${urlMatch[1]}`;
  }
  
  const allText = [title, ...headers].join(' ');
  const testMatch = allText.match(/(?:test|pt|preptest)\s*(\d+)/i);
  
  if (testMatch) {
    return `PrepTest ${testMatch[1]}`;
  }
  
  return 'Unknown Test';
}

function generateQuestionId(element) {
  const text = element.textContent.trim().substring(0, 50);
  const hash = text.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return `q_${Math.abs(hash)}_${Date.now()}`;
} 