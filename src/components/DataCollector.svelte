<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let isCollecting = false;
  
  let collectionLogs = [];
  let showLogs = false;
  
  async function startCollection() {
    isCollecting = true;
    collectionLogs = [];
    showLogs = true;
    
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
      addLog('Injecting content script...');
      
      // Set up message listener first
      chrome.runtime.onMessage.addListener(handleMessage);
      
      // Method 1: Try injected script approach
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: collectLSATData
        });
        addLog('Content script injected, waiting for data...');
      } catch (injectionError) {
        addLog(`Injection failed: ${injectionError.message}`);
      }
      
      // Method 2: Try direct content script communication
      setTimeout(async () => {
        if (isCollecting) {
          addLog('Trying direct content script communication...');
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'START_LSAT_COLLECTION'
            });
            addLog('Direct message sent to content script');
          } catch (directError) {
            addLog(`Direct communication failed: ${directError.message}`);
          }
        }
      }, 2000);
      
      // Method 3: Try executing collection directly
      setTimeout(async () => {
        if (isCollecting) {
          addLog('Trying direct script execution...');
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: directCollectionScript
            });
            addLog('Direct collection script executed');
          } catch (directExecError) {
            addLog(`Direct execution failed: ${directExecError.message}`);
          }
        }
      }, 4000);
      
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
          chrome.runtime.onMessage.removeListener(handleMessage);
        }
      }, 15000); // Increased to 15 seconds
      
    } catch (error) {
      console.error('Collection error:', error);
      addLog(`Error: ${error.message}`);
      dispatch('dataUpdate', {
        data: [],
        status: 'Error: ' + error.message
      });
      dispatch('collectionEnd');
      isCollecting = false;
    }
  }
  
  function handleMessage(message, sender, sendResponse) {
    console.log('Received message:', message);
    
    if (message.type === 'LSAT_DATA_UPDATE') {
      addLog(`${message.status}`);
      
      if (message.data && message.data.length > 0) {
        message.data.forEach((question, index) => {
          addLog(`Q${question.questionNumber}: ${question.questionType} - ${question.correct ? 'Correct' : 'Incorrect'} ${question.correct === null ? 'Unknown' : ''}`);
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
        chrome.runtime.onMessage.removeListener(handleMessage);
      }
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
  
  // This function will be injected into the page
  function collectLSATData() {
    console.log('LSAT data collection script executing...');
    
    // Send message to content script to start collection
    console.log('Sending START_LSAT_COLLECTION message...');
    window.postMessage({ type: 'START_LSAT_COLLECTION' }, '*');
    
    // Also try direct collection if content script doesn't respond
    setTimeout(() => {
      console.log('Triggering direct collection fallback...');
      window.postMessage({ type: 'START_LSAT_COLLECTION' }, '*');
    }, 1000);
    
    // Additional fallback - try to trigger content script directly
    setTimeout(() => {
      console.log('Attempting direct content script trigger...');
      if (window.chrome && window.chrome.runtime) {
        try {
          window.chrome.runtime.sendMessage({
            type: 'LSAT_DATA_UPDATE',
            data: [],
            status: 'Direct trigger attempt from injected script',
            complete: false
          });
        } catch (e) {
          console.log('Direct trigger failed:', e);
        }
      }
    }, 2000);
  }
  
  // Direct collection script that doesn't rely on content script
  function directCollectionScript() {
    console.log('Direct collection script executing...');
    
    // Try to find question data directly
    const questions = [];
    
    // Look for ResultListItem containers
    const containers = document.querySelectorAll('.ResultListItem-root, [class*="ResultListItem"]');
    console.log(`Found ${containers.length} ResultListItem containers`);
    
    containers.forEach((container, index) => {
      try {
        const button = container.querySelector('button');
        if (!button) return;
        
        const questionNumber = parseInt(button.textContent.trim());
        if (isNaN(questionNumber)) return;
        
        const typeElement = container.querySelector('[class*="MuiTypography"]');
        const questionType = typeElement ? typeElement.textContent.trim() : 'Unknown';
        
        const ariaPressedValue = button.getAttribute('aria-pressed');
        const isCorrect = ariaPressedValue === 'true';
        
        questions.push({
          questionId: `direct_q${questionNumber}_${Date.now()}`,
          questionNumber: questionNumber,
          questionType: questionType,
          difficulty: 'Unknown',
          correct: ariaPressedValue !== null ? isCorrect : null,
          testName: 'Direct Collection',
          questionText: container.textContent.substring(0, 200),
          source: 'direct',
          extractedAt: new Date().toISOString()
        });
        
        console.log(`Direct extraction - Q${questionNumber}: ${questionType} - ${isCorrect ? 'Correct' : 'Incorrect'}`);
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
    
    console.log(`Direct collection complete. Found ${questions.length} questions`);
  }
</script>

<div class="collector">
  <button 
    class="collect-btn" 
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
    margin-bottom: 20px;
  }
  
  .collect-btn {
    width: 100%;
    padding: 12px 16px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .collect-btn:hover:not(:disabled) {
    background: #45a049;
  }
  
  .collect-btn:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
  
  .collect-btn.collecting {
    background: #ff9800;
  }
  
  .instructions {
    margin: 12px 0 0 0;
    font-size: 12px;
    color: #666;
    text-align: center;
    line-height: 1.4;
  }
  
  .logs-container {
    margin-top: 16px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #f9f9f9;
  }
  
  .logs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #e0e0e0;
    background: #f0f0f0;
  }
  
  .logs-header h4 {
    margin: 0;
    font-size: 14px;
    color: #333;
  }
  
  .clear-logs-btn {
    padding: 4px 8px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 3px;
    font-size: 11px;
    cursor: pointer;
  }
  
  .clear-logs-btn:hover {
    background: #d32f2f;
  }
  
  .logs {
    max-height: 200px;
    overflow-y: auto;
    padding: 8px;
  }
  
  .log-entry {
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
    font-size: 11px;
    line-height: 1.3;
  }
  
  .timestamp {
    color: #666;
    font-family: monospace;
    min-width: 60px;
  }
  
  .message {
    color: #333;
    flex: 1;
  }
</style> 