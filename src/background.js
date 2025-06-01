// Background service worker for LSAT Demon Analyzer

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LSAT_DATA_COLLECTED') {
    // Store the collected data
    chrome.storage.local.get(['lsatData'], (result) => {
      const existingData = result.lsatData || [];
      const newData = [...existingData, ...message.data];
      
      // Remove duplicates based on question ID or content
      const uniqueData = newData.filter((question, index, self) => 
        index === self.findIndex(q => 
          q.questionId === question.questionId || 
          (q.questionText === question.questionText && q.testName === question.testName)
        )
      );
      
      chrome.storage.local.set({ lsatData: uniqueData }, () => {
        // Notify popup of updated data
        chrome.runtime.sendMessage({
          type: 'LSAT_DATA_UPDATE',
          data: uniqueData,
          status: `Collected ${message.data.length} new questions. Total: ${uniqueData.length}`,
          complete: message.complete
        });
      });
    });
    
    sendResponse({ success: true });
  }
  
  return true; // Keep message channel open for async response
});

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('LSAT Demon Analyzer installed');
}); 