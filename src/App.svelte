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
  
  <!-- Data Collection at the top -->
  <DataCollector 
    bind:isCollecting
    hasData={performanceData.length > 0}
    on:dataUpdate={handleDataUpdate}
    on:collectionStart={handleCollectionStart}
    on:collectionEnd={handleCollectionEnd}
    on:clearData={clearData}
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
    padding: 20px;
    height: 900px;
    overflow-y: auto;
    background: #fafafa;
    box-sizing: border-box;
  }
  
  header {
    text-align: center;
    margin-bottom: 24px;
    border-bottom: 2px solid #e0e0e0;
    padding-bottom: 20px;
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  h1 {
    margin: 0 0 8px 0;
    font-size: 24px;
    color: #333;
    font-weight: 700;
  }
  
  header p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
  
  .status {
    padding: 10px 12px;
    margin: 12px 0;
    border-radius: 8px;
    background: #e3f2fd;
    color: #1976d2;
    font-size: 14px;
    text-align: center;
    border-left: 4px solid #2196f3;
  }
  
  .status.collecting {
    background: #fff3e0;
    color: #f57c00;
    border-left-color: #ff9800;
  }
  
  .analytics {
    margin-top: 20px;
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .analytics h2 {
    margin: 0 0 16px 0;
    font-size: 20px;
    color: #333;
    font-weight: 600;
  }
  
  .analytics p {
    margin: 0 0 16px 0;
    font-weight: 500;
    color: #555;
    font-size: 14px;
  }
  
  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #666;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    font-size: 14px;
    line-height: 1.6;
  }
</style> 