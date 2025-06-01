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
      
      <button class="clear-btn" on:click={clearData}>Clear All Data</button>
    </div>
  {:else}
    <div class="empty-state">
      <p>No data collected yet. Navigate to LSAT Demon and click "Collect Data" to start analyzing your performance.</p>
    </div>
  {/if}
</main>

<style>
  main {
    padding: 16px;
    max-height: 600px;
    overflow-y: auto;
  }
  
  header {
    text-align: center;
    margin-bottom: 20px;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 16px;
  }
  
  h1 {
    margin: 0 0 8px 0;
    font-size: 20px;
    color: #333;
  }
  
  header p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
  
  .status {
    padding: 8px 12px;
    margin: 12px 0;
    border-radius: 4px;
    background: #e3f2fd;
    color: #1976d2;
    font-size: 14px;
    text-align: center;
  }
  
  .status.collecting {
    background: #fff3e0;
    color: #f57c00;
  }
  
  .analytics {
    margin-top: 20px;
  }
  
  .analytics h2 {
    margin: 0 0 16px 0;
    font-size: 18px;
    color: #333;
  }
  
  .analytics p {
    margin: 0 0 16px 0;
    font-weight: 500;
    color: #555;
  }
  
  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #666;
  }
  
  .clear-btn {
    width: 100%;
    padding: 8px 16px;
    margin-top: 20px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .clear-btn:hover {
    background: #d32f2f;
  }
</style> 