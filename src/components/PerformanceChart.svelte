<script>
  import { onMount, afterUpdate } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  
  Chart.register(...registerables);
  
  export let data = [];
  
  let chartCanvas;
  let chart;
  
  // Filter controls
  let showQuestionTypes = {};
  let showDifficulties = { '1': true, '2': true, '3': true, '4': true, '5': true };
  let showCorrect = true;
  let showIncorrect = true;
  
  $: questionTypes = [...new Set(data.map(q => q.questionType).filter(t => t))];
  $: difficulties = [...new Set(data.map(q => q.difficulty).filter(d => d))].sort();
  
  // Initialize question type toggles
  $: {
    questionTypes.forEach(type => {
      if (!(type in showQuestionTypes)) {
        showQuestionTypes[type] = true;
      }
    });
  }
  
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
      type: 'bar',
      data: {
        labels: [],
        datasets: []
      },
      options: {
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
            text: 'Performance by Question Type and Difficulty',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          tooltip: {
            position: 'nearest',
            yAlign: 'center',
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
        },
        animation: {
          onComplete: function() {
            addDifficultyLabels();
          }
        }
      }
    });
  }
  
  function addDifficultyLabels() {
    if (!chart) return;
    
    const ctx = chart.ctx;
    ctx.font = '12px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
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
  
  function updateChart() {
    if (!chart || !data.length) return;
    
    // Filter data based on controls
    const filteredData = data.filter(q => {
      if (!q.questionType || !(q.questionType in showQuestionTypes) || !showQuestionTypes[q.questionType]) return false;
      if (q.difficulty && !showDifficulties[q.difficulty]) return false;
      if (q.correct && !showCorrect) return false;
      if (!q.correct && !showIncorrect) return false;
      return true;
    });
    
    // Get active question types and difficulties
    const activeQuestionTypes = questionTypes.filter(type => showQuestionTypes[type]);
    const activeDifficulties = difficulties.filter(diff => showDifficulties[diff]);
    
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
    
    chart.data = chartData;
    chart.update();
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
  
  $: if (chart && data.length > 0) {
    updateChart();
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
          {#each questionTypes as type}
            <label class="checkbox-item">
              <input 
                type="checkbox" 
                bind:checked={showQuestionTypes[type]}
                on:change={() => updateChart()}
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
                  on:change={() => updateChart()}
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
                on:change={() => updateChart()}
              />
              <span class="checkbox-label correct">Correct</span>
            </label>
            <label class="checkbox-item">
              <input 
                type="checkbox" 
                bind:checked={showIncorrect}
                on:change={() => updateChart()}
              />
              <span class="checkbox-label incorrect">Incorrect</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Chart -->
  <div class="chart-wrapper">
    <canvas bind:this={chartCanvas} width="900" height="500"></canvas>
  </div>
  
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
    margin-bottom: 32px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 10px;
    border: 1px solid #e0e0e0;
  }
  
  .controls-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
  
  .control-section {
    display: flex;
    flex-direction: column;
  }
  
  .control-group {
    margin-bottom: 20px;
  }
  
  .control-group:last-child {
    margin-bottom: 0;
  }
  
  .control-group h4,
  .control-section > h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: #333;
    font-weight: 600;
  }
  
  .checkbox-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .checkbox-item {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 4px 0;
  }
  
  .checkbox-item input[type="checkbox"] {
    width: 16px;
    height: 16px;
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
    height: 500px;
    margin-bottom: 24px;
    background: white;
    border-radius: 8px;
    padding: 16px;
    border: 1px solid #f0f0f0;
  }
  
  canvas {
    max-height: 500px;
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