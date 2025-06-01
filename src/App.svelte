<script>
  import { onMount } from 'svelte';
  import PerformanceChart from './components/PerformanceChart.svelte';
  import DataCollector from './components/DataCollector.svelte';
  import QuestionTypeBreakdown from './components/QuestionTypeBreakdown.svelte';
  
  let performanceData = [];
  let isCollecting = false;
  let collectionStatus = '';
  
  onMount(async () => {
    // Load existing data from storage
    const result = await chrome.storage.local.get(['lsatData']);
    if (result.lsatData) {
      performanceData = result.lsatData;
    }
  });
  
  function handleDataUpdate(event) {
    performanceData = event.detail.data;
    collectionStatus = event.detail.status;
  }
  
  function handleCollectionStart() {
    isCollecting = true;
    collectionStatus = 'Starting data collection...';
  }
  
  function handleCollectionEnd() {
    isCollecting = false;
  }
  
  async function clearData() {
    performanceData = [];
    await chrome.storage.local.remove(['lsatData']);
    collectionStatus = 'Data cleared';
  }
</script>

<main>
  <header>
    <h1>LSAT Demon Analyzer</h1>
    <p>Analyze your performance by question type and difficulty</p>
  </header>
  
  {#if performanceData.length > 0}
    <button class="action-btn clear-btn" on:click={clearData}>Clear All Data</button>
  {/if}
  
  <DataCollector 
    bind:isCollecting
    on:dataUpdate={handleDataUpdate}
    on:collectionStart={handleCollectionStart}
    on:collectionEnd={handleCollectionEnd}
  />
  
  {#if collectionStatus}
    <div class="status" class:collecting={isCollecting}>
      {collectionStatus}
    </div>
  {/if}
  
  {#if performanceData.length > 0}
    <div class="analytics">
      <h2>Performance Analytics</h2>
      <p>Total Questions: {performanceData.length}</p>
      
      <PerformanceChart data={performanceData} />
      <QuestionTypeBreakdown data={performanceData} />
    </div>
  {:else}
    <div class="empty-state">
      <p>No data collected yet. Navigate to LSAT Demon and click "Collect Data" to start analyzing your performance.</p>
    </div>
  {/if}
</main>

<style>
  main {
    padding: 24px;
    max-height: 1080px;
    overflow-y: auto;
    background: #fafafa;
  }
  
  header {
    text-align: center;
    margin-bottom: 32px;
    border-bottom: 2px solid #e0e0e0;
    padding-bottom: 24px;
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  h1 {
    margin: 0 0 12px 0;
    font-size: 28px;
    color: #333;
    font-weight: 700;
  }
  
  header p {
    margin: 0;
    color: #666;
    font-size: 16px;
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
  
  .clear-btn {
    background: #f44336;
    color: white;
  }
  
  .clear-btn:hover {
    background: #d32f2f;
  }
  
  .status {
    padding: 12px 16px;
    margin: 16px 0;
    border-radius: 8px;
    background: #e3f2fd;
    color: #1976d2;
    font-size: 16px;
    text-align: center;
    border-left: 4px solid #2196f3;
  }
  
  .status.collecting {
    background: #fff3e0;
    color: #f57c00;
    border-left-color: #ff9800;
  }
  
  .analytics {
    margin-top: 32px;
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .analytics h2 {
    margin: 0 0 20px 0;
    font-size: 24px;
    color: #333;
    font-weight: 600;
  }
  
  .analytics p {
    margin: 0 0 24px 0;
    font-weight: 500;
    color: #555;
    font-size: 16px;
  }
  
  .empty-state {
    text-align: center;
    padding: 60px 40px;
    color: #666;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    font-size: 16px;
    line-height: 1.6;
  }
</style> 