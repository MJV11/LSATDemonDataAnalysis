// Background service worker for LSAT Demon Analyzer

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LSAT_DATA_COLLECTED') {
    // Store the collected data
    chrome.storage.local.get(['lsatData'], (result) => {
      const existingData = result.lsatData || [];
      const newData = message.data;
      
      // Create a map of existing questions by questionId for faster lookup
      const existingMap = new Map();
      existingData.forEach(question => {
        existingMap.set(question.questionId, question);
      });
      
      // Add only truly new questions
      const uniqueData = [...existingData];
      let actualNewCount = 0;
      
      newData.forEach(newQuestion => {
        if (!existingMap.has(newQuestion.questionId)) {
          uniqueData.push(newQuestion);
          actualNewCount++;
        } else {
          console.log(`Skipping duplicate question: ${newQuestion.questionId}`);
        }
      });
      
      chrome.storage.local.set({ lsatData: uniqueData }, () => {
        // Notify popup of updated data - try to send only to popup
        try {
          chrome.runtime.sendMessage({
            type: 'LSAT_DATA_UPDATE',
            data: uniqueData,
            newQuestions: newData.filter(newQ => !existingMap.has(newQ.questionId)),
            status: `Collected ${actualNewCount} new questions. Total: ${uniqueData.length}`,
            complete: message.complete
          });
        } catch (error) {
          console.log('Could not send message to popup:', error);
        }
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