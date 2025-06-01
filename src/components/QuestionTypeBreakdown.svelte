<script>
  export let data = [];
  
  $: questionTypeStats = calculateQuestionTypeStats(data);
  $: difficultyStats = calculateDifficultyStats(data);
  
  function calculateQuestionTypeStats(data) {
    const stats = {};
    
    data.forEach(question => {
      const type = question.questionType || '';
      // Skip empty types but allow questions without difficulty
      if (!type) return;
      
      if (!stats[type]) {
        stats[type] = { 
          total: 0, 
          correct: 0,
          difficulties: {} // Track by difficulty level
        };
      }
      stats[type].total++;
      if (question.correct) {
        stats[type].correct++;
      }
      
      // Track by difficulty
      const difficulty = question.difficulty || 'Unknown';
      if (!stats[type].difficulties[difficulty]) {
        stats[type].difficulties[difficulty] = { total: 0, correct: 0 };
      }
      stats[type].difficulties[difficulty].total++;
      if (question.correct) {
        stats[type].difficulties[difficulty].correct++;
      }
    });
    
    return Object.entries(stats)
      .map(([type, stat]) => ({
        type,
        total: stat.total,
        correct: stat.correct,
        accuracy: Math.round((stat.correct / stat.total) * 100),
        difficulties: Object.entries(stat.difficulties)
          .map(([difficulty, diffStat]) => ({
            difficulty,
            total: diffStat.total,
            correct: diffStat.correct,
            accuracy: Math.round((diffStat.correct / diffStat.total) * 100)
          }))
          .sort((a, b) => {
            if (a.difficulty === 'Unknown') return 1;
            if (b.difficulty === 'Unknown') return -1;
            return parseInt(a.difficulty) - parseInt(b.difficulty);
          })
      }))
      .sort((a, b) => b.total - a.total);
  }
  
  function calculateDifficultyStats(data) {
    const stats = {};
    
    data.forEach(question => {
      const difficulty = question.difficulty || 'Unknown';
      if (!stats[difficulty]) {
        stats[difficulty] = { total: 0, correct: 0 };
      }
      stats[difficulty].total++;
      if (question.correct) {
        stats[difficulty].correct++;
      }
    });
    
    return Object.entries(stats)
      .map(([difficulty, stat]) => ({
        difficulty,
        total: stat.total,
        correct: stat.correct,
        accuracy: Math.round((stat.correct / stat.total) * 100)
      }))
      .sort((a, b) => {
        const order = { 'Easy': 1, 'Medium': 2, 'Hard': 3, 'Unknown': 4 };
        return (order[a.difficulty] || 5) - (order[b.difficulty] || 5);
      });
  }
  
  function getAccuracyColor(accuracy) {
    if (accuracy >= 80) return '#4caf50';
    if (accuracy >= 60) return '#ff9800';
    return '#f44336';
  }
</script>

<div class="breakdown">
  <div class="section">
    <h3>Performance by Question Type</h3>
    {#if questionTypeStats.length > 0}
      <div class="stats-list">
        {#each questionTypeStats as stat}
          <div class="stat-item">
            <div class="stat-header">
              <span class="type-name">{stat.type}</span>
              <span class="accuracy" style="color: {getAccuracyColor(stat.accuracy)}">{stat.accuracy}%</span>
            </div>
            <div class="stat-details">
              <span>{stat.correct}/{stat.total} correct</span>
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  style="width: {stat.accuracy}%; background-color: {getAccuracyColor(stat.accuracy)}"
                ></div>
              </div>
            </div>
            
            <!-- Difficulty breakdown -->
            {#if stat.difficulties && stat.difficulties.length > 0}
              <div class="difficulty-breakdown">
                {#each stat.difficulties as diffStat}
                  <div class="difficulty-item">
                    <div class="difficulty-header">
                      <span class="difficulty-name">
                        {diffStat.difficulty === 'Unknown' ? 'No Difficulty' : `Level ${diffStat.difficulty}`}
                      </span>
                      <span class="difficulty-accuracy" style="color: {getAccuracyColor(diffStat.accuracy)}">{diffStat.accuracy}%</span>
                    </div>
                    <div class="difficulty-details">
                      <span>{diffStat.correct}/{diffStat.total} correct</span>
                      <div class="difficulty-progress-bar">
                        <div 
                          class="difficulty-progress-fill" 
                          style="width: {diffStat.accuracy}%; background-color: {getAccuracyColor(diffStat.accuracy)}"
                        ></div>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="no-data">No question type data available</p>
    {/if}
  </div>
  
  <div class="section">
    <h3>Performance by Difficulty</h3>
    {#if difficultyStats.length > 0}
      <div class="stats-list">
        {#each difficultyStats as stat}
          <div class="stat-item">
            <div class="stat-header">
              <span class="type-name">{stat.difficulty}</span>
              <span class="accuracy" style="color: {getAccuracyColor(stat.accuracy)}">{stat.accuracy}%</span>
            </div>
            <div class="stat-details">
              <span>{stat.correct}/{stat.total} correct</span>
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  style="width: {stat.accuracy}%; background-color: {getAccuracyColor(stat.accuracy)}"
                ></div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="no-data">No difficulty data available</p>
    {/if}
  </div>
</div>

<style>
  .breakdown {
    margin-top: 20px;
  }
  
  .section {
    margin-bottom: 24px;
  }
  
  h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: #333;
    font-weight: 600;
  }
  
  .stats-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .stat-item {
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 4px solid #e0e0e0;
  }
  
  .stat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .type-name {
    font-weight: 500;
    color: #333;
    font-size: 14px;
  }
  
  .accuracy {
    font-weight: bold;
    font-size: 14px;
  }
  
  .stat-details {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: #666;
  }
  
  .progress-bar {
    flex: 1;
    height: 6px;
    background: #e0e0e0;
    border-radius: 3px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    transition: width 0.3s ease;
  }
  
  .no-data {
    text-align: center;
    color: #999;
    font-style: italic;
    margin: 20px 0;
  }
  
  .difficulty-breakdown {
    margin-top: 12px;
    padding-left: 16px;
    border-left: 2px solid #e0e0e0;
  }
  
  .difficulty-item {
    margin-bottom: 8px;
    padding: 8px;
    background: #fafafa;
    border-radius: 4px;
  }
  
  .difficulty-item:last-child {
    margin-bottom: 0;
  }
  
  .difficulty-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  
  .difficulty-name {
    font-weight: 500;
    color: #555;
    font-size: 12px;
  }
  
  .difficulty-accuracy {
    font-weight: bold;
    font-size: 12px;
  }
  
  .difficulty-details {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: #777;
  }
  
  .difficulty-progress-bar {
    flex: 1;
    height: 4px;
    background: #e0e0e0;
    border-radius: 2px;
    overflow: hidden;
  }
  
  .difficulty-progress-fill {
    height: 100%;
    transition: width 0.3s ease;
  }
</style> 