<script>
  export let data = [];
  
  // Separate data by main question type
  $: rcData = data.filter(q => isReadingComprehension(q.questionType));
  $: lrData = data.filter(q => isLogicalReasoning(q.questionType));
  
  $: rcQuestionTypeStats = calculateQuestionTypeStats(rcData);
  $: lrQuestionTypeStats = calculateQuestionTypeStats(lrData);
  $: rcDifficultyStats = calculateDifficultyStats(rcData);
  $: lrDifficultyStats = calculateDifficultyStats(lrData);
  
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
      .map(([type, stat]) => {
        // Create placeholders for all difficulty levels 1-5
        const allDifficulties = ['1', '2', '3', '4', '5'];
        const difficulties = allDifficulties.map(difficulty => {
          const diffStat = stat.difficulties[difficulty];
          if (diffStat) {
            return {
              difficulty,
              total: diffStat.total,
              correct: diffStat.correct,
              accuracy: Math.round((diffStat.correct / diffStat.total) * 100),
              hasData: true
            };
          } else {
            return {
              difficulty,
              total: 0,
              correct: 0,
              accuracy: 0,
              hasData: false
            };
          }
        });
        
        // Add Unknown difficulty if it exists
        if (stat.difficulties['Unknown']) {
          const unknownStat = stat.difficulties['Unknown'];
          difficulties.push({
            difficulty: 'Unknown',
            total: unknownStat.total,
            correct: unknownStat.correct,
            accuracy: Math.round((unknownStat.correct / unknownStat.total) * 100),
            hasData: true
          });
        }
        
        return {
          type,
          total: stat.total,
          correct: stat.correct,
          accuracy: Math.round((stat.correct / stat.total) * 100),
          difficulties
        };
      })
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
    <h3>Reading Comprehension</h3>
    {#if rcQuestionTypeStats.length > 0}
      <div class="stats-list">
        {#each rcQuestionTypeStats as stat}
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
                  <div class="difficulty-item-inline" class:no-data={!diffStat.hasData}>
                    <span class="difficulty-name">
                      {diffStat.difficulty === 'Unknown' ? 'No Difficulty' : `Level ${diffStat.difficulty}`}
                    </span>
                    {#if diffStat.hasData}
                      <span class="difficulty-stats">{diffStat.correct}/{diffStat.total}</span>
                      <div class="difficulty-progress-bar-inline">
                        <div 
                          class="difficulty-progress-fill" 
                          style="width: {diffStat.accuracy}%; background-color: {getAccuracyColor(diffStat.accuracy)}"
                        ></div>
                      </div>
                      <span class="difficulty-accuracy" style="color: {getAccuracyColor(diffStat.accuracy)}">{diffStat.accuracy}%</span>
                    {:else}
                      <span class="difficulty-placeholder">No data</span>
                    {/if}
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
    <h3>Logical Reasoning</h3>
    {#if lrQuestionTypeStats.length > 0}
      <div class="stats-list">
        {#each lrQuestionTypeStats as stat}
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
                  <div class="difficulty-item-inline" class:no-data={!diffStat.hasData}>
                    <span class="difficulty-name">
                      {diffStat.difficulty === 'Unknown' ? 'No Difficulty' : `Level ${diffStat.difficulty}`}
                    </span>
                    {#if diffStat.hasData}
                      <span class="difficulty-stats">{diffStat.correct}/{diffStat.total}</span>
                      <div class="difficulty-progress-bar-inline">
                        <div 
                          class="difficulty-progress-fill" 
                          style="width: {diffStat.accuracy}%; background-color: {getAccuracyColor(diffStat.accuracy)}"
                        ></div>
                      </div>
                      <span class="difficulty-accuracy" style="color: {getAccuracyColor(diffStat.accuracy)}">{diffStat.accuracy}%</span>
                    {:else}
                      <span class="difficulty-placeholder">No data</span>
                    {/if}
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
    {#if rcDifficultyStats.length > 0}
      <div class="stat-item">
        <div class="stat-header">
          <span class="type-name">Reading Comprehension - All Difficulties</span>
          <span class="accuracy" style="color: {getAccuracyColor(Math.round((rcDifficultyStats.reduce((sum, s) => sum + s.correct, 0) / rcDifficultyStats.reduce((sum, s) => sum + s.total, 0)) * 100))}">
            {Math.round((rcDifficultyStats.reduce((sum, s) => sum + s.correct, 0) / rcDifficultyStats.reduce((sum, s) => sum + s.total, 0)) * 100)}%
          </span>
        </div>
        <div class="stat-details">
          <span>{rcDifficultyStats.reduce((sum, s) => sum + s.correct, 0)}/{rcDifficultyStats.reduce((sum, s) => sum + s.total, 0)} correct</span>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              style="width: {Math.round((rcDifficultyStats.reduce((sum, s) => sum + s.correct, 0) / rcDifficultyStats.reduce((sum, s) => sum + s.total, 0)) * 100)}%; background-color: {getAccuracyColor(Math.round((rcDifficultyStats.reduce((sum, s) => sum + s.correct, 0) / rcDifficultyStats.reduce((sum, s) => sum + s.total, 0)) * 100))}"
            ></div>
          </div>
        </div>
        
        <!-- Difficulty breakdown -->
        <div class="difficulty-breakdown">
          {#each rcDifficultyStats as stat}
            <div class="difficulty-item-inline">
              <span class="difficulty-name">Level {stat.difficulty}</span>
              <span class="difficulty-stats">{stat.correct}/{stat.total}</span>
              <div class="difficulty-progress-bar-inline">
                <div 
                  class="difficulty-progress-fill" 
                  style="width: {stat.accuracy}%; background-color: {getAccuracyColor(stat.accuracy)}"
                ></div>
              </div>
              <span class="difficulty-accuracy" style="color: {getAccuracyColor(stat.accuracy)}">{stat.accuracy}%</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    {#if lrDifficultyStats.length > 0}
      <div class="stat-item">
        <div class="stat-header">
          <span class="type-name">Logical Reasoning - All Difficulties</span>
          <span class="accuracy" style="color: {getAccuracyColor(Math.round((lrDifficultyStats.reduce((sum, s) => sum + s.correct, 0) / lrDifficultyStats.reduce((sum, s) => sum + s.total, 0)) * 100))}">
            {Math.round((lrDifficultyStats.reduce((sum, s) => sum + s.correct, 0) / lrDifficultyStats.reduce((sum, s) => sum + s.total, 0)) * 100)}%
          </span>
        </div>
        <div class="stat-details">
          <span>{lrDifficultyStats.reduce((sum, s) => sum + s.correct, 0)}/{lrDifficultyStats.reduce((sum, s) => sum + s.total, 0)} correct</span>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              style="width: {Math.round((lrDifficultyStats.reduce((sum, s) => sum + s.correct, 0) / lrDifficultyStats.reduce((sum, s) => sum + s.total, 0)) * 100)}%; background-color: {getAccuracyColor(Math.round((lrDifficultyStats.reduce((sum, s) => sum + s.correct, 0) / lrDifficultyStats.reduce((sum, s) => sum + s.total, 0)) * 100))}"
            ></div>
          </div>
        </div>
        
        <!-- Difficulty breakdown -->
        <div class="difficulty-breakdown">
          {#each lrDifficultyStats as stat}
            <div class="difficulty-item-inline">
              <span class="difficulty-name">Level {stat.difficulty}</span>
              <span class="difficulty-stats">{stat.correct}/{stat.total}</span>
              <div class="difficulty-progress-bar-inline">
                <div 
                  class="difficulty-progress-fill" 
                  style="width: {stat.accuracy}%; background-color: {getAccuracyColor(stat.accuracy)}"
                ></div>
              </div>
              <span class="difficulty-accuracy" style="color: {getAccuracyColor(stat.accuracy)}">{stat.accuracy}%</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    {#if rcDifficultyStats.length === 0 && lrDifficultyStats.length === 0}
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
  }
  
  .difficulty-breakdown {
    margin-top: 12px;
    padding-left: 16px;
    border-left: 2px solid #e0e0e0;
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
  
  .difficulty-progress-fill {
    height: 100%;
    transition: width 0.3s ease;
  }
  
  .difficulty-item-inline {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .difficulty-stats {
    font-size: 12px;
    color: #666;
  }
  
  .difficulty-progress-bar-inline {
    flex: 1;
    height: 4px;
    background: #e0e0e0;
    border-radius: 2px;
    overflow: hidden;
  }
  
  .difficulty-item-inline.no-data {
    opacity: 0.5;
  }
  
  .difficulty-item-inline.no-data .difficulty-name {
    color: #999;
  }
  
  .difficulty-placeholder {
    font-style: italic;
    color: #999;
    font-size: 12px;
  }
</style> 