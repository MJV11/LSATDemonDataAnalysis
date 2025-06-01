<script>
  import { onMount, afterUpdate } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  
  Chart.register(...registerables);
  
  export let data = [];
  
  let chartCanvas;
  let chart;
  
  onMount(() => {
    createChart();
  });
  
  afterUpdate(() => {
    if (chart && data.length > 0) {
      updateChart();
    }
  });
  
  function createChart() {
    if (!chartCanvas) return;
    
    const ctx = chartCanvas.getContext('2d');
    
    chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Correct', 'Incorrect'],
        datasets: [{
          data: [0, 0],
          backgroundColor: ['#4caf50', '#f44336'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true
            }
          },
          title: {
            display: true,
            text: 'Overall Performance',
            font: {
              size: 16,
              weight: 'bold'
            }
          }
        }
      }
    });
  }
  
  function updateChart() {
    if (!chart || !data.length) return;
    
    const correct = data.filter(q => q.correct).length;
    const incorrect = data.length - correct;
    
    chart.data.datasets[0].data = [correct, incorrect];
    chart.update();
  }
  
  $: if (chart && data.length > 0) {
    updateChart();
  }
</script>

<div class="chart-container">
  <canvas bind:this={chartCanvas} width="300" height="200"></canvas>
  
  {#if data.length > 0}
    <div class="stats">
      <div class="stat">
        <span class="label">Accuracy:</span>
        <span class="value">{Math.round((data.filter(q => q.correct).length / data.length) * 100)}%</span>
      </div>
      <div class="stat">
        <span class="label">Total Questions:</span>
        <span class="value">{data.length}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .chart-container {
    margin: 20px 0;
    text-align: center;
  }
  
  canvas {
    max-height: 200px;
  }
  
  .stats {
    display: flex;
    justify-content: space-around;
    margin-top: 16px;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 6px;
  }
  
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .label {
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
  }
  
  .value {
    font-size: 18px;
    font-weight: bold;
    color: #333;
  }
</style> 