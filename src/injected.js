// Injected script that runs in the page context
// This can access page variables and functions that content scripts cannot

(function() {
  'use strict';
  
  console.log('LSAT Demon Analyzer injected script loaded');
  
  // Try to hook into any existing LSAT Demon JavaScript
  function hookIntoPageData() {
    // Look for common variable names that might contain question data
    const possibleDataSources = [
      'questions',
      'questionData',
      'testData',
      'analyticsData',
      'performanceData',
      'results'
    ];
    
    const foundData = [];
    
    possibleDataSources.forEach(varName => {
      try {
        if (window[varName] && Array.isArray(window[varName])) {
          console.log(`Found potential data source: ${varName}`, window[varName]);
          foundData.push({
            source: varName,
            data: window[varName]
          });
        }
      } catch (error) {
        // Ignore errors accessing variables
      }
    });
    
    return foundData;
  }
  
  // Monitor for AJAX requests that might contain question data
  function interceptAjaxRequests() {
    const originalXHR = window.XMLHttpRequest;
    const originalFetch = window.fetch;
    
    // Intercept XMLHttpRequest
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      const originalSend = xhr.send;
      
      xhr.open = function(method, url, ...args) {
        this._url = url;
        return originalOpen.apply(this, [method, url, ...args]);
      };
      
      xhr.send = function(...args) {
        this.addEventListener('load', function() {
          if (this._url && this._url.includes('question') || this._url.includes('analytics')) {
            try {
              const data = JSON.parse(this.responseText);
              console.log('Intercepted AJAX response:', this._url, data);
              
              // Send to content script
              window.postMessage({
                type: 'AJAX_DATA_INTERCEPTED',
                url: this._url,
                data: data
              }, '*');
            } catch (error) {
              // Not JSON or other error
            }
          }
        });
        
        return originalSend.apply(this, args);
      };
      
      return xhr;
    };
    
    // Intercept fetch requests
    window.fetch = function(url, options = {}) {
      return originalFetch(url, options).then(response => {
        if (url.includes('question') || url.includes('analytics')) {
          response.clone().json().then(data => {
            console.log('Intercepted fetch response:', url, data);
            
            window.postMessage({
              type: 'FETCH_DATA_INTERCEPTED',
              url: url,
              data: data
            }, '*');
          }).catch(() => {
            // Not JSON or other error
          });
        }
        
        return response;
      });
    };
  }
  
  // Look for React or Vue components that might contain data
  function findComponentData() {
    const foundData = [];
    
    // Look for React components
    const reactElements = document.querySelectorAll('[data-reactroot], [data-react-class]');
    reactElements.forEach(element => {
      try {
        const reactInstance = element._reactInternalInstance || element.__reactInternalInstance;
        if (reactInstance && reactInstance.memoizedProps) {
          foundData.push({
            type: 'react',
            data: reactInstance.memoizedProps
          });
        }
      } catch (error) {
        // Ignore errors
      }
    });
    
    // Look for Vue components
    const vueElements = document.querySelectorAll('[data-v-]');
    vueElements.forEach(element => {
      try {
        if (element.__vue__) {
          foundData.push({
            type: 'vue',
            data: element.__vue__.$data
          });
        }
      } catch (error) {
        // Ignore errors
      }
    });
    
    return foundData;
  }
  
  // Main extraction function
  function extractPageData() {
    const extractedData = {
      pageData: hookIntoPageData(),
      componentData: findComponentData(),
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    
    // Send data to content script
    window.postMessage({
      type: 'PAGE_DATA_EXTRACTED',
      data: extractedData
    }, '*');
    
    return extractedData;
  }
  
  // Set up interceptors
  interceptAjaxRequests();
  
  // Listen for extraction requests
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    if (event.data.type === 'EXTRACT_PAGE_DATA') {
      extractPageData();
    }
  });
  
  // Auto-extract on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', extractPageData);
  } else {
    extractPageData();
  }
  
})(); 