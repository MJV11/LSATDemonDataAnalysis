<script>
  import { onMount, afterUpdate } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  
  Chart.register(...registerables);
  
  export let data = [];
  
  let rcChartCanvas;
  let rcChart;
  let lrChartCanvas;
  let lrChart;
  
  // Filter controls
  let showQuestionTypes = {};
  let showDifficulties = { '1': true, '2': true, '3': true, '4': true, '5': true };
  let showCorrect = true;
  let showIncorrect = true;
  
  // Separate data by main question type
  $: rcData = data.filter(q => isReadingComprehension(q.questionType));
  $: lrData = data.filter(q => isLogicalReasoning(q.questionType));
  
  $: rcQuestionTypes = [...new Set(rcData.map(q => q.questionType).filter(t => t))];
  $: lrQuestionTypes = [...new Set(lrData.map(q => q.questionType).filter(t => t))];
  $: difficulties = [...new Set(data.map(q => q.difficulty).filter(d => d))].sort();
  
  // Initialize question type toggles
  $: {
    [...rcQuestionTypes, ...lrQuestionTypes].forEach(type => {
      if (!(type in showQuestionTypes)) {
        showQuestionTypes[type] = true;
      }
    });
  }
  
  function isReadingComprehension(questionType) {
    const rcTypes = [
      'Main Point', 'Stated', 'Supported', 'Meaning', 'Organization', 
      'Tone', 'Purpose', 'Agree', 'Analogy', 'Strengthen'
    ];
    return rcTypes.includes(questionType);
  }
  
  function isLogicalReasoning(questionType) {
    const lrTypes = [
      'Weaken', 'Assumption', 'Inference', 'Flaw',
      'Method of Reasoning', 'Principle', 'Parallel Reasoning',
      'Resolve', 'Evaluate'
    ];
    return lrTypes.includes(questionType);
  }
  
  onMount(() => {
    createRCChart();
    createLRChart();
  });
  
  afterUpdate(() => {
    if (rcChart && rcData.length > 0) {
      updateRCChart();
    }
    if (lrChart && lrData.length > 0) {
      updateLRChart();
    }
  });
  
  function createRCChart() {
    if (!rcChartCanvas) return;
    
    const ctx = rcChartCanvas.getContext('2d');
    
    rcChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        ...getChartOptions('Reading Comprehension Performance'),
        animation: {
          onComplete: function() {
            addDifficultyLabelsToChart(rcChart);
          }
        }
      }
    });
  }
  
  function createLRChart() {
    if (!lrChartCanvas) return;
    
    const ctx = lrChartCanvas.getContext('2d');
    
    lrChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        ...getChartOptions('Logical Reasoning Performance'),
        animation: {
          onComplete: function() {
            addDifficultyLabelsToChart(lrChart);
          }
        }
      }
    });
  }
  
  function getChartOptions(title) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: 'Question Types'
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            callback: function(value) {
              if (Number.isInteger(value)) {
                return value;
              }
            }
          },
          title: {
            display: true,
            text: 'Number of Questions'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        tooltip: {
          position: 'nearest',
          yAlign: 'center',
          xAlign: 'center',
          displayColors: false,
          callbacks: {
            title: function(context) {
              return context[0].dataset.label.split(' - ')[0];
            },
            label: function(context) {
              const difficulty = context.dataset.label.split(' - ')[0];
              const correctness = context.dataset.label.split(' - ')[1];
              const count = context.parsed.y;
              return `${difficulty} (${correctness}): ${count} questions`;
            }
          }
        }
      }
    };
  }
  
  function addDifficultyLabels() {
    addDifficultyLabelsToChart(rcChart);
    addDifficultyLabelsToChart(lrChart);
  }
  
  function addDifficultyLabelsToChart(chartInstance) {
    if (!chartInstance) return;
    
    const ctx = chartInstance.ctx;
    ctx.font = '12px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    chartInstance.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chartInstance.getDatasetMeta(datasetIndex);
      if (!meta.hidden) {
        meta.data.forEach((bar, index) => {
          const value = dataset.data[index];
          if (value > 0) {
            const difficulty = dataset.label.split(' - ')[0].replace('Difficulty ', '');
            const x = bar.x;
            const y = bar.y + (bar.height / 2);
            ctx.fillText(difficulty, x, y);
          }
        });
      }
    });
  }
  
  function updateRCChart() {
    if (!rcChart || !rcData.length) return;
    
    // Filter RC data based on controls
    const filteredData = rcData.filter(q => {
      if (!q.questionType || !(q.questionType in showQuestionTypes) || !showQuestionTypes[q.questionType]) return false;
      if (q.difficulty && !showDifficulties[q.difficulty]) return false;
      if (q.correct && !showCorrect) return false;
      if (!q.correct && !showIncorrect) return false;
      return true;
    });
    
    const activeQuestionTypes = rcQuestionTypes.filter(type => showQuestionTypes[type]);
    const activeDifficulties = difficulties.filter(diff => showDifficulties[diff]);
    
    updateChartData(rcChart, filteredData, activeQuestionTypes, activeDifficulties);
  }
  
  function updateLRChart() {
    if (!lrChart || !lrData.length) return;
    
    // Filter LR data based on controls
    const filteredData = lrData.filter(q => {
      if (!q.questionType || !(q.questionType in showQuestionTypes) || !showQuestionTypes[q.questionType]) return false;
      if (q.difficulty && !showDifficulties[q.difficulty]) return false;
      if (q.correct && !showCorrect) return false;
      if (!q.correct && !showIncorrect) return false;
      return true;
    });
    
    const activeQuestionTypes = lrQuestionTypes.filter(type => showQuestionTypes[type]);
    const activeDifficulties = difficulties.filter(diff => showDifficulties[diff]);
    
    updateChartData(lrChart, filteredData, activeQuestionTypes, activeDifficulties);
  }
  
  function updateChartData(chartInstance, filteredData, activeQuestionTypes, activeDifficulties) {
    // Prepare chart data
    const chartData = {
      labels: activeQuestionTypes,
      datasets: []
    };
    
    // Create datasets for each difficulty level (correct first, then incorrect)
    if (showCorrect) {
      activeDifficulties.forEach(difficulty => {
        const correctData = activeQuestionTypes.map(type => {
          return filteredData.filter(q => 
            q.questionType === type && 
            q.difficulty === difficulty && 
            q.correct
          ).length;
        });
        
        chartData.datasets.push({
          label: `Difficulty ${difficulty} - Correct`,
          data: correctData,
          backgroundColor: getDifficultyColor(difficulty, true),
          borderColor: getDifficultyColor(difficulty, true),
          borderWidth: 1
        });
      });
    }
    
    if (showIncorrect) {
      activeDifficulties.forEach(difficulty => {
        const incorrectData = activeQuestionTypes.map(type => {
          return filteredData.filter(q => 
            q.questionType === type && 
            q.difficulty === difficulty && 
            !q.correct
          ).length;
        });
        
        chartData.datasets.push({
          label: `Difficulty ${difficulty} - Incorrect`,
          data: incorrectData,
          backgroundColor: getDifficultyColor(difficulty, false),
          borderColor: getDifficultyColor(difficulty, false),
          borderWidth: 1
        });
      });
    }
    
    chartInstance.data = chartData;
    chartInstance.update();
  }
  
  function getDifficultyColor(difficulty, isCorrect) {
    const baseColors = {
      '1': isCorrect ? '#c8e6c9' : '#ffcdd2', // Light green/red
      '2': isCorrect ? '#a5d6a7' : '#ef9a9a', // Medium-light green/red
      '3': isCorrect ? '#81c784' : '#e57373', // Medium green/red
      '4': isCorrect ? '#66bb6a' : '#ef5350', // Medium-dark green/red
      '5': isCorrect ? '#4caf50' : '#f44336'  // Dark green/red
    };
    return baseColors[difficulty] || (isCorrect ? '#4caf50' : '#f44336');
  }
  
  $: if (rcChart && rcData.length > 0) {
    updateRCChart();
  }
  $: if (lrChart && lrData.length > 0) {
    updateLRChart();
  }
</script>

<div class="chart-container">
  <!-- Controls -->
  <div class="controls">
    <div class="controls-layout">
      <!-- Left side: Question Types -->
      <div class="control-section">
        <h4>Question Types</h4>
        <div class="checkbox-list">
          {#each [...rcQuestionTypes, ...lrQuestionTypes] as type}
            <label class="checkbox-item">
              <input 
                type="checkbox" 
                bind:checked={showQuestionTypes[type]}
                on:change={() => {
                  updateRCChart();
                  updateLRChart();
                }}
              />
              <span class="checkbox-label">{type}</span>
            </label>
          {/each}
        </div>
      </div>
      
      <!-- Right side: Difficulty and Correctness -->
      <div class="control-section">
        <div class="control-group">
          <h4>Difficulty Levels</h4>
          <div class="checkbox-list">
            {#each difficulties as difficulty}
              <label class="checkbox-item">
                <input 
                  type="checkbox" 
                  bind:checked={showDifficulties[difficulty]}
                  on:change={() => {
                    updateRCChart();
                    updateLRChart();
                  }}
                />
                <span class="checkbox-label">Level {difficulty}</span>
              </label>
            {/each}
          </div>
        </div>
        
        <div class="control-group">
          <h4>Correctness</h4>
          <div class="checkbox-list">
            <label class="checkbox-item">
              <input 
                type="checkbox" 
                bind:checked={showCorrect}
                on:change={() => {
                  updateRCChart();
                  updateLRChart();
                }}
              />
              <span class="checkbox-label correct">Correct</span>
            </label>
            <label class="checkbox-item">
              <input 
                type="checkbox" 
                bind:checked={showIncorrect}
                on:change={() => {
                  updateRCChart();
                  updateLRChart();
                }}
              />
              <span class="checkbox-label incorrect">Incorrect</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Charts -->
  {#if rcData.length > 0}
    <div class="chart-wrapper">
      <canvas bind:this={rcChartCanvas} width="100%" height="400"></canvas>
    </div>
  {/if}
  
  {#if lrData.length > 0}
    <div class="chart-wrapper">
      <canvas bind:this={lrChartCanvas} width="100%" height="400"></canvas>
    </div>
  {/if}
  
  {#if data.length > 0}
    <div class="stats">
      <div class="stat">
        <span class="label">Total Questions:</span>
        <span class="value">{data.length}</span>
      </div>
      <div class="stat">
        <span class="label">Overall Accuracy:</span>
        <span class="value">{Math.round((data.filter(q => q.correct).length / data.length) * 100)}%</span>
      </div>
      {#if rcData.length > 0}
        <div class="stat">
          <span class="label">RC Accuracy:</span>
          <span class="value">{Math.round((rcData.filter(q => q.correct).length / rcData.length) * 100)}%</span>
        </div>
      {/if}
      {#if lrData.length > 0}
        <div class="stat">
          <span class="label">LR Accuracy:</span>
          <span class="value">{Math.round((lrData.filter(q => q.correct).length / lrData.length) * 100)}%</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .chart-container {
    margin: 32px 0;
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .controls {
    margin-bottom: 20px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 10px;
    border: 1px solid #e0e0e0;
  }
  
  .controls-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  
  .control-section {
    display: flex;
    flex-direction: column;
  }
  
  .control-group {
    margin-bottom: 16px;
  }
  
  .control-group:last-child {
    margin-bottom: 0;
  }
  
  .control-group h4,
  .control-section > h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #333;
    font-weight: 600;
  }
  
  .checkbox-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .checkbox-item {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }
  
  .checkbox-item input[type="checkbox"] {
    height: 14px;
    cursor: pointer;
  }
  
  .checkbox-label {
    font-size: 14px;
    color: #333;
    cursor: pointer;
    user-select: none;
  }
  
  .checkbox-label.correct {
    color: #4caf50;
    font-weight: 500;
  }
  
  .checkbox-label.incorrect {
    color: #f44336;
    font-weight: 500;
  }
  
  .chart-wrapper {
    height: 400px;
    margin-bottom: 20px;
    background: white;
    border-radius: 8px;
    padding: 12px;
    border: 1px solid #f0f0f0;
  }
  
  canvas {
    max-height: 400px;
    width: 100% !important;
  }
  
  .stats {
    display: flex;
    justify-content: space-around;
    padding: 20px;
    background: #f5f5f5;
    border-radius: 8px;
    margin-top: 16px;
  }
  
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .label {
    font-size: 14px;
    color: #666;
    margin-bottom: 6px;
    font-weight: 500;
  }
  
  .value {
    font-size: 24px;
    font-weight: bold;
    color: #333;
  }
</style> 