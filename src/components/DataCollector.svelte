<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let isCollecting = false;
  export let hasData = false;
  
  let collectionLogs = [];
  let showLogs = false;
  let messageListener = null;
  let isProcessingMessage = false;
  
  function handleClearData() {
    dispatch('clearData');
  }
  
  async function startCollection() {
    isCollecting = true;
    collectionLogs = [];
    showLogs = true;
    isProcessingMessage = false;
    
    // Clean up any existing listener first
    if (messageListener) {
      chrome.runtime.onMessage.removeListener(messageListener);
      messageListener = null;
    }
    
    dispatch('collectionStart');
    addLog('Starting data collection...');
    
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('lsatdemon.com')) {
        addLog('Error: Not on LSAT Demon website');
        dispatch('dataUpdate', {
          data: [],
          status: 'Please navigate to LSAT Demon first'
        });
        dispatch('collectionEnd');
        isCollecting = false;
        return;
      }
      
      addLog(`Found LSAT Demon page: ${tab.url}`);
      addLog('Executing collection script...');
      
      // Set up message listener - create a new function reference each time
      messageListener = (message, sender, sendResponse) => {
        handleMessage(message, sender, sendResponse);
      };
      chrome.runtime.onMessage.addListener(messageListener);
      
      // Execute direct collection script
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: directCollectionScript
        });
        addLog('Collection script executed');
      } catch (execError) {
        addLog(`Script execution failed: ${execError.message}`);
        throw execError;
      }
      
      // Set a timeout in case nothing happens
      setTimeout(() => {
        if (isCollecting) {
          addLog('Collection timeout - no data received');
          dispatch('dataUpdate', {
            data: [],
            status: 'Collection timeout - try refreshing the page and trying again'
          });
          dispatch('collectionEnd');
          isCollecting = false;
          if (messageListener) {
            chrome.runtime.onMessage.removeListener(messageListener);
            messageListener = null;
          }
        }
      }, 10000);
      
    } catch (error) {
      console.error('Collection error:', error);
      addLog(`Error: ${error.message}`);
      dispatch('dataUpdate', {
        data: [],
        status: 'Error: ' + error.message
      });
      dispatch('collectionEnd');
      isCollecting = false;
      if (messageListener) {
        chrome.runtime.onMessage.removeListener(messageListener);
        messageListener = null;
      }
    }
  }
  
  function handleMessage(message, sender, sendResponse) {
    console.log('Received message:', message);
    
    if (message.type === 'LSAT_DATA_UPDATE') {
      // Prevent double processing
      if (isProcessingMessage) {
        console.log('Already processing message, ignoring duplicate');
        return;
      }
      
      isProcessingMessage = true;
      
      addLog(`${message.status}`);
      
      // Log only the newly collected questions with deduplication
      if (message.newQuestions && message.newQuestions.length > 0) {
        const loggedQuestions = new Set();
        
        message.newQuestions.forEach((question) => {
          const logKey = `Q${question.questionNumber}:${question.questionType}:${question.correct}`;
          
          if (!loggedQuestions.has(logKey)) {
            loggedQuestions.add(logKey);
            addLog(`Q${question.questionNumber}: ${question.questionType} - ${question.correct ? 'Correct' : 'Incorrect'}`);
          } else {
            console.log(`Skipping duplicate log for: ${logKey}`);
          }
        });
      }
      
      dispatch('dataUpdate', {
        data: message.data,
        status: message.status
      });
      
      if (message.complete) {
        addLog('Collection complete!');
        dispatch('collectionEnd');
        isCollecting = false;
        if (messageListener) {
          chrome.runtime.onMessage.removeListener(messageListener);
          messageListener = null;
        }
      }
      
      // Reset the flag after a short delay
      setTimeout(() => {
        isProcessingMessage = false;
      }, 100);
    }
  }
  
  function addLog(message) {
    collectionLogs = [...collectionLogs, {
      timestamp: new Date().toLocaleTimeString(),
      message: message
    }];
  }
  
  function clearLogs() {
    collectionLogs = [];
    showLogs = false;
  }
  
  // Direct collection script that extracts question data from DOM
  function directCollectionScript() {
    console.log('Direct collection script executing...');
    
    // Try to find question data directly
    const questions = [];
    const seenQuestions = new Set();
    
    // Look for ResultListItem containers
    const containers = document.querySelectorAll('.ResultListItem-root, [class*="ResultListItem"]');
    console.log(`Found ${containers.length} ResultListItem containers`);
    
    // Extract test name from URL once
    const url = window.location.href;
    const urlMatch = url.match(/test[\/\-_]?(\d+)/i);
    const testName = urlMatch ? `Test ${urlMatch[1]}` : 'Unknown Test';
    
    containers.forEach((container, index) => {
      try {
        const button = container.querySelector('button');
        if (!button) return;
        
        const questionNumber = parseInt(button.textContent.trim());
        if (isNaN(questionNumber)) return;
        
        // Create a unique key for this question
        const questionKey = `${testName}_q${questionNumber}`;
        
        if (seenQuestions.has(questionKey)) {
          console.log(`Skipping duplicate question: ${questionKey} (container ${index})`);
          return;
        }
        
        seenQuestions.add(questionKey);
        
        const typeElement = container.querySelector('[class*="MuiTypography"]');
        const questionType = typeElement ? typeElement.textContent.trim() : '';
        
        // If questionType is "Unknown", make it empty string
        const cleanQuestionType = questionType === 'Unknown' ? '' : questionType;
        
        // Extract difficulty from aria-label
        let difficulty = '';
        const difficultyElement = container.querySelector('[aria-label*="Difficulty"]');
        if (difficultyElement) {
          const ariaLabel = difficultyElement.getAttribute('aria-label');
          const difficultyMatch = ariaLabel.match(/Difficulty\s+(\d+)/i);
          if (difficultyMatch) {
            difficulty = difficultyMatch[1]; // Store as string: "1", "2", "3", "4", "5"
          }
        }
        
        // Check correctness using the css-cuudmx class
        const hasWrongClass = container.querySelector('.css-cuudmx') !== null;
        const isCorrect = !hasWrongClass; // If css-cuudmx is present, question is wrong
        
        // Create stable question ID without timestamp
        const questionId = questionKey;
        
        questions.push({
          questionId: questionId,
          questionNumber: questionNumber,
          questionType: cleanQuestionType,
          difficulty: difficulty,
          correct: isCorrect,
          testName: testName,
          questionText: container.textContent.substring(0, 200),
          source: 'direct',
          extractedAt: new Date().toISOString()
        });
        
        console.log(`Direct extraction - Q${questionNumber}: ${cleanQuestionType} - ${isCorrect ? 'Correct' : 'Incorrect'} (css-cuudmx: ${hasWrongClass})`);
      } catch (error) {
        console.warn('Error in direct extraction:', error);
      }
    });
    
    // Send results directly to background script
    if (chrome && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'LSAT_DATA_COLLECTED',
        data: questions,
        complete: true
      });
    }
    
    console.log(`Direct collection complete. Found ${questions.length} unique questions`);
  }
</script>

<div class="collector">
  {#if hasData}
    <button class="action-btn clear-btn" on:click={handleClearData}>Clear All Data</button>
  {/if}
  
  <button 
    class="action-btn collect-btn" 
    class:collecting={isCollecting}
    on:click={startCollection}
    disabled={isCollecting}
  >
    {#if isCollecting}
      Collecting Data...
    {:else}
      Collect Data from Current Page
    {/if}
  </button>
  
  <p class="instructions">
    Navigate to your LSAT Demon practice tests or analytics pages and click the button above to harvest your performance data.
  </p>
  
  {#if showLogs}
    <div class="logs-container">
      <div class="logs-header">
        <h4>Collection Progress</h4>
        <button class="clear-logs-btn" on:click={clearLogs}>Clear</button>
      </div>
      <div class="logs">
        {#each collectionLogs as log}
          <div class="log-entry">
            <span class="timestamp">{log.timestamp}</span>
            <span class="message">{log.message}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .collector {
    margin-bottom: 32px;
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .action-btn {
    width: 100%;
    padding: 16px 20px;
    border: none;
    border-radius: 8px;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-bottom: 16px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .action-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
  
  .action-btn:disabled {
    background: #cccccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .collect-btn {
    background: #4caf50;
    color: white;
  }
  
  .collect-btn:hover:not(:disabled) {
    background: #45a049;
  }
  
  .collect-btn.collecting {
    background: #ff9800;
  }
  
  .instructions {
    margin: 0 0 16px 0;
    font-size: 14px;
    color: #666;
    text-align: center;
    line-height: 1.5;
    background: #f8f9fa;
    padding: 12px;
    border-radius: 6px;
  }
  
  .logs-container {
    margin-top: 20px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #f9f9f9;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  .logs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
    background: #f0f0f0;
    border-radius: 8px 8px 0 0;
  }
  
  .logs-header h4 {
    margin: 0;
    font-size: 16px;
    color: #333;
    font-weight: 600;
  }
  
  .clear-logs-btn {
    padding: 6px 12px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .clear-logs-btn:hover {
    background: #d32f2f;
  }
  
  .logs {
    max-height: 150px;
    overflow-y: auto;
    padding: 12px;
  }
  
  .log-entry {
    display: flex;
    gap: 12px;
    font-size: 13px;
    line-height: 1.4;
    padding: 4px 0;
  }
  
  .timestamp {
    color: #666;
    font-family: monospace;
    min-width: 80px;
    font-size: 12px;
  }
  
  .message {
    color: #333;
    flex: 1;
  }
  
  .clear-btn {
    background: #f44336;
    color: white;
  }
  
  .clear-btn:hover:not(:disabled) {
    background: #d32f2f;
  }
</style> 